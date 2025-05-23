import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.admin.services.permission.actionProvider.register({
    section: 'plugins',
    displayName: 'Access Permit Authorization',
    uid: 'access',
    pluginName: 'permit-strapi',
  });

  // strapi.server.use(strapi.plugin('permit-strapi').middleware('permit-check'));
};

export default register;
