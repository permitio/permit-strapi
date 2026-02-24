import type { Core } from '@strapi/strapi';
import { Permit } from 'permitio';
import { debugLog } from './utils/logger';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const config = await strapi
    .plugin('permit-strapi')
    .service('config')
    .getConfig();

  if (!config?.apiKey) {
    debugLog(strapi, '[permit-strapi] No config found, skipping initialization');
    return;
  }

  (strapi as any).permit = new Permit({
    token: config.apiKey,
    pdp: config.pdpUrl,
  });

  debugLog(strapi, '[permit-strapi] Permit.io client initialized');

  const excludedResources = await strapi
    .plugin('permit-strapi')
    .service('config')
    .getExcludedResources();

  await strapi
    .plugin('permit-strapi')
    .service('config')
    .syncResourcesToPermit(excludedResources);

  await strapi
    .plugin('permit-strapi')
    .service('roles')
    .syncRolesToPermit();
};

export default bootstrap;
