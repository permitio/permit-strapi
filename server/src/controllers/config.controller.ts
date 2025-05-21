import type { Core } from '@strapi/strapi';
import type { PermitConfig } from '../../types/permit';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async saveConfig(ctx) {
    try {
      if (!ctx.request.body) {
        return ctx.badRequest('Request body is missing', {
          success: false,
          message: 'Request body is missing. Please pass token and pdp url',
        });
      }

      const { token, pdp } = ctx.request.body;

      const result = await strapi.plugin('permit-strapi').service('configService').saveConfig({
        token,
        pdp,
      });

      if (result.success) {
        ctx.body = result;
      } else {
        ctx.badRequest(result.message, result);
      }
    } catch (error) {
      ctx.throw(500, `Failed to save configuration: ${error.message}`);
    }
  },

  async getConfig(ctx) {
    try {
      const config = await strapi.plugin('permit-strapi').service('configService').getConfig();

      strapi.log.info(`Logging Fetched Configuration from Store ${JSON.stringify(config)}`);

      const sanitizedConfig = config
        ? {
            pdp: config.pdp,
            hasToken: !!config.token,
          }
        : null;

      ctx.body = {
        success: true,
        config: sanitizedConfig,
      };
    } catch (error) {
      ctx.throw(500, `Failed to retrieve configuration: ${error.message}`);
    }
  },

  async updateConfig(ctx) {
    try {
      // Check if request body exists
      if (!ctx.request.body) {
        return ctx.badRequest('Request body is missing', {
          success: false,
          message: 'Request body is missing',
        });
      }

      const { token, pdp } = ctx.request.body;

      // Create update object with only provided fields
      const updateData: Partial<PermitConfig> = {};
      if (token !== undefined) updateData.token = token;
      if (pdp !== undefined) updateData.pdp = pdp;

      // Nothing to update
      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest('No fields provided for update', {
          success: false,
          message: 'No fields provided for update',
        });
      }

      const result = await strapi
        .plugin('permit-strapi')
        .service('configService')
        .updateConfig(updateData);

      if (result.success) {
        ctx.body = result;
      } else {
        ctx.badRequest(result.message, result);
      }
    } catch (error) {
      strapi.log.error('Error in updateConfig controller:', error);
      ctx.badRequest('Failed to update configuration', {
        success: false,
        message: 'Failed to update configuration',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async deleteConfig(ctx) {
    try {
      const result = await strapi.plugin('permit-strapi').service('configService').deleteConfig();

      if (result.success) {
        ctx.body = result;
      } else {
        ctx.badRequest(result.message, result);
      }
    } catch (error) {
      strapi.log.error('Error in deleteConfig controller:', error);
      ctx.badRequest('Failed to delete configuration', {
        success: false,
        message: 'Failed to delete configuration',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

export default controller;
