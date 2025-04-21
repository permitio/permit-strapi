import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  // Get current configuration
  async getConfig(ctx) {
    console.log('context ===>', ctx);
    try {
      const config = await strapi.plugin('strapi-permit-auth').service('permitConfig').getConfig();

      // Don't send API key in response
      if (config?.permitApiKey) {
        config.permitApiKey = undefined;
      }

      return ctx.send({
        data: config,
        message: 'Configuration retrieved successfully',
      });
    } catch (err) {
      return ctx.badRequest(null, 'Failed to retrieve configuration');
    }
  },

  // Update configuration
  async updateConfig(ctx) {
    try {
      const config = await strapi
        .plugin('strapi-permit-auth')
        .service('permitConfig')
        .updateConfig(ctx.request.body);

      return ctx.send({
        data: config,
        message: 'Configuration updated successfully',
      });
    } catch (err) {
      return ctx.badRequest(null, 'Failed to update configuration');
    }
  },

  // Test connection
  async testConnection(ctx) {
    try {
      const result = await strapi
        .plugin('strapi-permit-auth')
        .service('permitConfig')
        .testConnection(ctx.request.body);

      return ctx.send({
        success: true,
        message: 'Connection test successful',
      });
    } catch (err) {
      return ctx.badRequest(null, err.message);
    }
  },
});

export default controller;
