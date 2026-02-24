import type { Core } from '@strapi/strapi';
import permitAuthMiddleware from './middlewares/permit-auth';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.server.use(permitAuthMiddleware({ strapi }));

  // Real-time sync for UP role changes
  strapi.db.lifecycles.subscribe({
    models: ['plugin::users-permissions.role'],

    async afterCreate({ result }) {
      await strapi.plugin('permit-strapi').service('roles').createOrUpdatePermitRole(result);
    },

    async afterUpdate({ result }) {
      await strapi.plugin('permit-strapi').service('roles').createOrUpdatePermitRole(result);
    },

    async afterDelete({ result }) {
      await strapi.plugin('permit-strapi').service('roles').deletePermitRole(result);
    },
  });

  // Real-time sync for UP user changes
  strapi.db.lifecycles.subscribe({
    models: ['plugin::users-permissions.user'],

    async afterCreate({ result }) {
      await strapi.plugin('permit-strapi').service('users').syncUserToPermit(result);
    },

    async afterUpdate({ result }) {
      await strapi.plugin('permit-strapi').service('users').syncUserToPermit(result);
    },

    async afterDelete({ result }) {
      await strapi.plugin('permit-strapi').service('users').deletePermitUser(result);
    },
  });

  // Resource instance sync for ReBAC — subscribes to all models, filters to api:: CTs in the callback
  strapi.db.lifecycles.subscribe({
    async afterCreate(event: any) {
      const { model, result } = event;
      if (!model?.uid?.startsWith('api::') || !result?.documentId) return;

      const permit = (strapi as any).permit;
      if (!permit) return;

      const configService = strapi.plugin('permit-strapi').service('config');
      const excluded = await configService.getExcludedResources();
      if (excluded.includes(model.uid)) return;

      const rebacConfig = await configService.getRebacConfig();
      if (!rebacConfig[model.uid]?.enabled) return;

      await strapi
        .plugin('permit-strapi')
        .service('instances')
        .createResourceInstance(model.uid, result.documentId);
    },

    async afterDelete(event: any) {
      const { model, result } = event;
      if (!model?.uid?.startsWith('api::') || !result?.documentId) return;

      const permit = (strapi as any).permit;
      if (!permit) return;

      const configService = strapi.plugin('permit-strapi').service('config');
      const excluded = await configService.getExcludedResources();
      if (excluded.includes(model.uid)) return;

      const rebacConfig = await configService.getRebacConfig();
      if (!rebacConfig[model.uid]?.enabled) return;

      await strapi
        .plugin('permit-strapi')
        .service('instances')
        .deleteResourceInstance(model.uid, result.documentId);
    },
  });
};

export default register;
