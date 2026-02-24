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

/**
 * Global Permit.io enforcement middleware.
 *
 * Intercepts every authenticated /api/ request, resolves the user identity
 * via Strapi's JWT service, derives the resource and action from the URL,
 * and calls permit.check() before passing the request to the controller.
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
        });
        if (fullUser) {
          const userAttributes: Record<string, any> = {};
          for (const field of userAttrMappings) {
            if (fullUser[field] !== undefined && fullUser[field] !== null) {
              userAttributes[field] = fullUser[field];
            }
          }
          userObj = { key: userId, attributes: userAttributes };
        }
      } catch (err) {
        strapi.log.warn(`[permit-strapi] Failed to fetch user attributes: ${err.message}`);
      }
    }

    // Build resource object.
    // Single-resource routes always include the instance key (supports RBAC, ABAC, ReBAC).
    // List routes pass type only (no single resource to evaluate).
    const resourceAttrMappings = await configService.getResourceAttributeMappings();
    const mappedResourceFields = resourceAttrMappings[resourceUid] || [];
    let resourceObj: any = resourceName;

    if (hasId && resourceId) {
      if (mappedResourceFields.length > 0) {
        try {
          const entity = await strapi.db.query(resourceUid).findOne({
            where: { documentId: resourceId },
          });
          if (entity) {
            const resourceAttributes: Record<string, any> = {};
            for (const field of mappedResourceFields) {
              if (entity[field] !== undefined && entity[field] !== null) {
                resourceAttributes[field] = entity[field];
              }
            }
            resourceObj = { type: resourceName, key: resourceId, attributes: resourceAttributes };
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
    } else if (mappedResourceFields.length > 0) {
      resourceObj = { type: resourceName };
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
