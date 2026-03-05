import type { Core } from '@strapi/strapi';
import { debugLog } from '../utils/logger';

/** Maps HTTP method + URL shape to the corresponding Strapi controller action name. */
const deriveAction = (method: string, hasId: boolean): string | null => {
  if (method === 'GET')    return hasId ? 'findOne' : 'find';
  if (method === 'POST')   return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return null;
};

/** Extracts ABAC attributes from an entity, flattening relations to `${field}Id`. */
const extractAttributes = (entity: any, mappedFields: string[]): Record<string, any> => {
  const attributes: Record<string, any> = {};
  for (const field of mappedFields) {
    const value = entity[field];
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && value.id !== undefined) {
      attributes[`${field}Id`] = value.id;
    } else {
      attributes[field] = value;
    }
  }
  return attributes;
};

/**
 * Global Permit.io enforcement middleware.
 *
 * Intercepts every authenticated /api/ request, resolves the user identity
 * via Strapi's JWT service, derives the resource and action from the URL,
 * and calls permit.check() before passing the request to the controller.
 *
 * For list routes (find) with ABAC mappings, the middleware lets the request
 * through to Strapi, then post-filters the response using permit.bulkCheck()
 * to remove entities the user is not authorized to see.
 *
 * Fails open: if the Permit.io client is not initialized or the PDP is
 * unreachable, the request passes through without enforcement.
 */
const permitAuthMiddleware = ({ strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (!ctx.request.url.startsWith('/api/')) {
      return next();
    }

    const authHeader = ctx.request.headers.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const permit = (strapi as any).permit;
    if (!permit) {
      return next();
    }

    // Verify JWT using Strapi's users-permissions JWT service.
    // ctx.state.user is always null at global middleware level — Strapi's
    // JWT auth runs as route middleware after this, so we must self-verify.
    const token = authHeader.slice(7);
    let userId: string;
    let decodedId: number;
    try {
      const jwtService = strapi.plugin('users-permissions').service('jwt');
      const decoded = await jwtService.verify(token);
      decodedId = decoded.id;
      userId = `strapi-${decoded.id}`;
    } catch {
      return next();
    }

    // Derive resource from URL path: /api/posts/abc123 → slug=posts, id=abc123
    const urlPath = ctx.request.url.split('?')[0];
    const pathParts = urlPath.split('/').filter(Boolean);
    if (pathParts.length < 2) return next();

    const resourceSlug = pathParts[1];
    const hasId = pathParts.length > 2;
    const resourceId = hasId ? pathParts[2] : null;

    const ctEntry = Object.values(strapi.contentTypes)
      .filter((ct: any) => ct.uid.startsWith('api::'))
      .find((ct: any) =>
        ct.info?.pluralName === resourceSlug ||
        ct.info?.singularName === resourceSlug
      ) as any;

    if (!ctEntry) {
      return next();
    }

    const resourceUid = ctEntry.uid;
    const resourceName = resourceUid.split('::')[1]?.split('.')[0];

    const configService = strapi.plugin('permit-strapi').service('config');
    const excludedResources = await configService.getExcludedResources();

    if (excludedResources.includes(resourceUid)) {
      debugLog(strapi, `[permit-strapi] Skipping excluded resource: ${resourceUid}`);
      return next();
    }

    const action = deriveAction(ctx.request.method, hasId);
    if (!action) return next();

    // Build user object — plain string for RBAC, { key, attributes } for ABAC
    const userAttrMappings = await configService.getUserAttributeMappings();
    let userObj: any = userId;

    if (userAttrMappings.length > 0) {
      try {
        const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: decodedId },
          populate: userAttrMappings,
        });
        if (fullUser) {
          const attrs = extractAttributes(fullUser, userAttrMappings);
          attrs.strapiId = decodedId;
          userObj = { key: userId, attributes: attrs };
        }
      } catch (err) {
        strapi.log.warn(`[permit-strapi] Failed to fetch user attributes: ${err.message}`);
      }
    }

    const resourceAttrMappings = await configService.getResourceAttributeMappings();
    const mappedResourceFields = resourceAttrMappings[resourceUid] || [];

    // List routes with ABAC mappings: let Strapi handle the request, then post-filter.
    if (action === 'find' && mappedResourceFields.length > 0) {
      await next();

      // Only filter successful JSON responses with a data array
      if (ctx.status !== 200 || !ctx.body?.data || !Array.isArray(ctx.body.data)) return;

      const entities = ctx.body.data;
      if (entities.length === 0) return;

      try {
        // Fetch full entities with populated relations for attribute extraction
        const documentIds = entities.map((e: any) => e.documentId);
        const fullEntities = await strapi.db.query(resourceUid).findMany({
          where: { documentId: { $in: documentIds } },
          populate: mappedResourceFields,
        });

        // Strapi 5 returns draft + published rows per entity. Use the first
        // row per documentId (draft) so relation IDs stay consistent with
        // single-resource queries used in findOne checks.
        const entityMap = new Map<string, any>();
        for (const e of fullEntities) {
          if (!entityMap.has(e.documentId)) {
            entityMap.set(e.documentId, e);
          }
        }

        // Build bulk check requests
        const checks = entities.map((entity: any) => {
          const full = entityMap.get(entity.documentId);
          const attrs = full ? extractAttributes(full, mappedResourceFields) : {};
          return {
            user: userObj,
            action: 'find',
            resource: { type: resourceName, key: entity.documentId, attributes: attrs },
          };
        });

        debugLog(
          strapi,
          `[permit-strapi] bulkCheck: user=${typeof userObj === 'string' ? userObj : userObj.key} action=find resource=${resourceName} count=${checks.length}`
        );

        const results: boolean[] = await permit.bulkCheck(checks);

        const allowed = entities.filter((_: any, i: number) => results[i]);
        const denied = entities.length - allowed.length;

        if (denied > 0) {
          debugLog(
            strapi,
            `[permit-strapi] bulkCheck filtered: ${allowed.length} allowed, ${denied} denied out of ${entities.length} ${resourceName}(s)`
          );
        }

        ctx.body = {
          ...ctx.body,
          data: allowed,
          meta: {
            ...ctx.body.meta,
            pagination: ctx.body.meta?.pagination
              ? { ...ctx.body.meta.pagination, total: allowed.length }
              : undefined,
          },
        };
      } catch (err) {
        strapi.log.error(`[permit-strapi] bulkCheck failed, returning unfiltered: ${err.message}`);
      }

      return;
    }

    // Single-resource routes: pre-check with permit.check()
    let resourceObj: any = resourceName;

    if (hasId && resourceId) {
      if (mappedResourceFields.length > 0) {
        try {
          const entity = await strapi.db.query(resourceUid).findOne({
            where: { documentId: resourceId },
            populate: mappedResourceFields,
          });
          if (entity) {
            resourceObj = { type: resourceName, key: resourceId, attributes: extractAttributes(entity, mappedResourceFields) };
          } else {
            resourceObj = { type: resourceName, key: resourceId };
          }
        } catch (err) {
          strapi.log.warn(`[permit-strapi] Failed to fetch resource attributes: ${err.message}`);
          resourceObj = { type: resourceName, key: resourceId };
        }
      } else {
        resourceObj = { type: resourceName, key: resourceId };
      }
    }

    debugLog(
      strapi,
      `[permit-strapi] check: user=${typeof userObj === 'string' ? userObj : userObj.key} action=${action} resource=${typeof resourceObj === 'string' ? resourceObj : `${resourceObj.type}(key=${resourceObj.key ?? 'none'}, attrs=${JSON.stringify(resourceObj.attributes || {})})`}`
    );

    try {
      const permitted = await permit.check(userObj, action, resourceObj);

      if (!permitted) {
        strapi.log.warn(
          `[permit-strapi] DENIED: user=${userId} action=${action} resource=${resourceName}`
        );
        ctx.status = 403;
        ctx.body = {
          data: null,
          error: {
            status: 403,
            name: 'ForbiddenError',
            message: 'You are not authorized to perform this action',
            details: {},
          },
        };
        return;
      }

      debugLog(strapi, `[permit-strapi] ALLOWED: user=${userId} action=${action} resource=${resourceName}`);
      return next();
    } catch (error) {
      strapi.log.error(`[permit-strapi] permit.check() failed: ${error.message}`);
      return next();
    }
  };
};

export default permitAuthMiddleware;
