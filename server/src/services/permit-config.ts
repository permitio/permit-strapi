import type { Core } from '@strapi/strapi';

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getConfig() {
    const config = await strapi.query('plugin::strapi-permit-auth.permit-config').findOne();
    return config;
  },

  async updateConfig(data) {
    const existingConfig = await this.getConfig();

    if (existingConfig) {
      return await strapi.query('plugin::strapi-permit-auth.permit-config').update({
        where: { id: existingConfig.id },
        data,
      });
    }

    return await strapi.query('plugin::strapi-permit-auth.permit-config').create({
      data,
    });
  },

  async testConnection({ permitApiKey, organizationId }) {
    try {
      // TODO: Add actual Permit.io API test
      // This will be implemented when we add Permit.io SDK
      return true;
    } catch (error) {
      throw new Error('Failed to connect to Permit.io');
    }
  },
});

export default service;
