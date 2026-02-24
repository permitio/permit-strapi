import type { Core } from '@strapi/strapi';

const configController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async saveConfig(ctx) {
    const { apiKey, pdpUrl } = ctx.request.body;

    if (!apiKey) {
      return ctx.badRequest('API key is required');
    }

    if (!pdpUrl) {
      return ctx.badRequest('PDP URL is required');
    }

    try {
      const result = await strapi
        .plugin('permit-strapi')
        .service('config')
        .validateAndSave({ apiKey, pdpUrl });

      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[permit-strapi] saveConfig failed: ${error.message}`);
      return ctx.badRequest(error.message);
    }
  },

  async getExcludedResources(ctx) {
    const excludedResources = await strapi
      .plugin('permit-strapi')
      .service('config')
      .getExcludedResources();
    ctx.body = { excludedResources };
  },

  async saveExcludedResources(ctx) {
    const { excludedResources } = ctx.request.body;

    if (!Array.isArray(excludedResources)) {
      return ctx.badRequest('excludedResources must be an array');
    }

    await strapi
      .plugin('permit-strapi')
      .service('config')
      .saveExcludedResources(excludedResources);

    ctx.body = { success: true };
  },

  async deleteConfig(ctx) {
    const store = await strapi.plugin('permit-strapi').service('config').getStore();
    await store.delete({ key: 'config' });
    (strapi as any).permit = null;
    ctx.body = { success: true };
  },

  async getContentTypes(ctx) {
    const contentTypes = Object.values(strapi.contentTypes)
      .filter((ct: any) => ct.kind === 'collectionType' && ct.uid.startsWith('api::'))
      .map((ct: any) => ({
        uid: ct.uid,
        displayName: ct.info?.displayName || ct.uid,
        apiID: ct.info?.singularName || ct.uid,
      }));

    ctx.body = { contentTypes };
  },

  async syncAllUsers(ctx) {
    try {
      const result = await strapi
        .plugin('permit-strapi')
        .service('users')
        .syncAllUsers();
      ctx.body = result;
    } catch (error) {
      return ctx.badRequest(error.message);
    }
  },

  async getConfig(ctx) {
    const config = await strapi
      .plugin('permit-strapi')
      .service('config')
      .getConfig();

    if (!config) {
      return (ctx.body = { configured: false });
    }

    const maskedApiKey = `${'*'.repeat(8)}${config.apiKey.slice(-4)}`;

    ctx.body = {
      configured: true,
      pdpUrl: config.pdpUrl,
      apiKey: maskedApiKey,
    };
  },

  async getUserAttributeMappings(ctx) {
    const mappings = await strapi
      .plugin('permit-strapi')
      .service('config')
      .getUserAttributeMappings();
    ctx.body = { mappings };
  },

  async saveUserAttributeMappings(ctx) {
    const { mappings } = ctx.request.body;

    if (!Array.isArray(mappings)) {
      return ctx.badRequest('mappings must be an array of field names');
    }

    const configService = strapi.plugin('permit-strapi').service('config');
    await configService.saveUserAttributeMappings(mappings);

    const excludedResources = await configService.getExcludedResources();
    await configService.syncResourcesToPermit(excludedResources);

    ctx.body = { success: true };
  },

  async getResourceAttributeMappings(ctx) {
    const mappings = await strapi
      .plugin('permit-strapi')
      .service('config')
      .getResourceAttributeMappings();
    ctx.body = { mappings };
  },

  async saveResourceAttributeMappings(ctx) {
    const { mappings } = ctx.request.body;

    if (!mappings || typeof mappings !== 'object') {
      return ctx.badRequest('mappings must be an object of { uid: string[] }');
    }

    const configService = strapi.plugin('permit-strapi').service('config');
    await configService.saveResourceAttributeMappings(mappings);

    const excludedResources = await configService.getExcludedResources();
    await configService.syncResourcesToPermit(excludedResources);

    ctx.body = { success: true };
  },

  async getContentTypeFields(ctx) {
    const { uid } = ctx.params;
    const ct = strapi.contentTypes[uid] as any;

    if (!ct) {
      return ctx.notFound(`Content type ${uid} not found`);
    }

    const scalarTypes = [
      'string', 'text', 'richtext', 'email', 'uid', 'enumeration',
      'integer', 'biginteger', 'float', 'decimal',
      'boolean',
      'date', 'datetime', 'time',
      'json',
    ];

    const fields = Object.entries(ct.attributes || {})
      .filter(([, attr]: [string, any]) => scalarTypes.includes(attr.type))
      .map(([name, attr]: [string, any]) => ({
        name,
        type: attr.type,
      }));

    ctx.body = { fields };
  },

  async getUserFields(ctx) {
    const userCt = strapi.contentTypes['plugin::users-permissions.user'] as any;
    if (!userCt) {
      return ctx.notFound('User content type not found');
    }

    const scalarTypes = [
      'string', 'text', 'email', 'enumeration',
      'integer', 'biginteger', 'float', 'decimal',
      'boolean',
      'date', 'datetime', 'time',
    ];

    const systemFields = ['password', 'resetPasswordToken', 'confirmationToken', 'provider', 'confirmed', 'blocked'];

    const fields = Object.entries(userCt.attributes || {})
      .filter(([name, attr]: [string, any]) =>
        scalarTypes.includes(attr.type) && !systemFields.includes(name)
      )
      .map(([name, attr]: [string, any]) => ({
        name,
        type: attr.type,
      }));

    ctx.body = { fields };
  },
});

export default configController;
