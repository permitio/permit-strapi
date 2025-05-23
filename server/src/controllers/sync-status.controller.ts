import type { Core } from '@strapi/strapi';

const syncStatusController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getUsersStatus(ctx) {
    try {
      const result = await strapi
        .plugin('permit-strapi')
        .service('syncStatusService')
        .getUsersStatus();

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, `Failed to get users sync status: ${error.message}`);
    }
  },

  async getRolesStatus(ctx) {
    try {
      const result = await strapi
        .plugin('permit-strapi')
        .service('syncStatusService')
        .getRolesStatus();

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, `Failed to get roles sync status: ${error.message}`);
    }
  },

  async getResourcesStatus(ctx) {
    try {
      const result = await strapi
        .plugin('permit-strapi')
        .service('syncStatusService')
        .getResourcesStatus();

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, `Failed to get resources sync status: ${error.message}`);
    }
  },
});

export default syncStatusController;
