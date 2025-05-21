import type { Core } from '@strapi/strapi';

const healthController = ({ strapi }: { strapi: Core.Strapi }) => ({
  index(ctx) {
    ctx.body = strapi.plugin('permit-strapi').service('healthService').getWelcomeMessage();
  },

  async testConnection(ctx) {
    try {
      const result = await strapi.plugin('permit-strapi').service('healthService').testConnection();
      ctx.body = result;
    } catch (error) {
      ctx.throw(500, `Connection test failed: ${error.message}`);
    }
  },
});

export default healthController;
