import type { Core } from '@strapi/strapi';
import { Permit } from 'permitio';

const healthService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Permit-Strapi plugin 🔐';
  },

  async testConnection() {
    try {
      const permit = await strapi.plugin('permit-strapi').service('configService').getClient();

      const tenants = await permit.api.tenants.list();

      return {
        success: true,
        tenants: tenants,
      };
    } catch (error) {
      strapi.log.error('Failed to connect to Permit.io', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export default healthService;
