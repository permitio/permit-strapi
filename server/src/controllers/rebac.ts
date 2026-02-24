import type { Core } from '@strapi/strapi';
import { debugLog } from '../utils/logger';

/** "api::article.article" → "article" */
const extractResourceKey = (uid: string): string =>
  uid.split('::')[1]?.split('.')[0] ?? uid;

const rebacController = ({ strapi }: { strapi: Core.Strapi }) => ({

  async getRebacConfig(ctx) {
    const config = await strapi
      .plugin('permit-strapi')
      .service('config')
      .getRebacConfig();
    ctx.body = { config };
  },

  async saveRebacConfig(ctx) {
    const { config } = ctx.request.body;

    if (!config || typeof config !== 'object') {
      return ctx.badRequest('config must be an object');
    }

    await strapi.plugin('permit-strapi').service('config').saveRebacConfig(config);
    ctx.body = { success: true };
  },

  async syncInstances(ctx) {
    const uid = decodeURIComponent(ctx.params.uid);
    const ct = strapi.contentTypes[uid];

    if (!ct || !uid.startsWith('api::')) {
      return ctx.notFound(`Content type ${uid} not found`);
    }

    try {
      const result = await strapi
        .plugin('permit-strapi')
        .service('instances')
        .syncAllInstances(uid);
      ctx.body = result;
    } catch (error) {
      return ctx.badRequest(error.message);
    }
  },

  async getInstanceRoles(ctx) {
    const uid = decodeURIComponent(ctx.params.uid);
    const store = await strapi.plugin('permit-strapi').service('config').getStore();
    const allRoles = await store.get({ key: 'rebacInstanceRoles' }) as Record<string, Array<{ key: string; name: string }>> | null;
    ctx.body = { roles: allRoles?.[uid] || [] };
  },

  /**
   * Saves instance roles to the Strapi store and syncs them to Permit.io
   * as resource roles on the corresponding resource.
   *
   * Body: `{ roles: [{ key: "owner", name: "Owner" }, ...] }`
   */
  async saveInstanceRoles(ctx) {
    const uid = decodeURIComponent(ctx.params.uid);
    const { roles } = ctx.request.body;

    if (!Array.isArray(roles)) {
      return ctx.badRequest('roles must be an array of { key, name }');
    }

    const ct = strapi.contentTypes[uid];
    if (!ct || !uid.startsWith('api::')) {
      return ctx.notFound(`Content type ${uid} not found`);
    }

    const store = await strapi.plugin('permit-strapi').service('config').getStore();
    const allRoles = (await store.get({ key: 'rebacInstanceRoles' }) as Record<string, any> | null) || {};
    allRoles[uid] = roles;
    await store.set({ key: 'rebacInstanceRoles', value: allRoles });

    const permit = (strapi as any).permit;
    if (permit) {
      const resourceKey = extractResourceKey(uid);
      for (const role of roles) {
        try {
          await permit.api.resourceRoles.create(resourceKey, {
            key: role.key,
            name: role.name,
          });
          debugLog(strapi, `[permit-strapi] Created resource role "${role.key}" on ${resourceKey}`);
        } catch {
          try {
            await permit.api.resourceRoles.update(resourceKey, role.key, { name: role.name });
            debugLog(strapi, `[permit-strapi] Updated resource role "${role.key}" on ${resourceKey}`);
          } catch (updateError) {
            strapi.log.warn(`[permit-strapi] Could not sync role "${role.key}" on ${resourceKey}: ${updateError.message}`);
          }
        }
      }
    }

    ctx.body = { success: true };
  },
});

export default rebacController;
