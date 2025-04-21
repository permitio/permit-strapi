/**
 * The your-middleware.js file
 * declares a basic middleware function and exports it.
 */
import { Permit } from 'permitio';

export interface Config {
  token?: string;
  pdp?: string;
}

let permitClient: Permit | null = null;

const initializePermitClient = async () => {
  if (permitClient) return permitClient;

  const pluginStore = strapi.store({
    type: 'plugin',
    name: 'strapi-permit-auth',
  });

  const config: Config = await pluginStore.get({ key: 'config' });
  if (!config || !config.token || !config.pdp) {
    strapi.log.warn('Permit.io not configured, RBAC middleware will be skipped');
    return null;
  }

  permitClient = new Permit({
    token: config.token,
    pdp: config.pdp,
  });

  return permitClient;
};

const middleware = async (ctx: any, next: () => Promise<void>) => {
  // Allow the request to continue to other middlewares first
  await next();

  // Skip non-content API routes
  if (!ctx.request.url.startsWith('/api/')) {
    return;
  }

  // Skip if no user is authenticated
  if (!ctx.state || !ctx.state.user) {
    strapi.log.debug('No authenticated user found, skipping RBAC check');
    return;
  }

  // Initialize Permit.io client
  const permit = await initializePermitClient();
  if (!permit) {
    strapi.log.debug('Permit.io client not initialized, skipping RBAC check');
    return;
  }

  strapi.log.info(`Initialized Permit Client ${permit}`);

  strapi.log.info(`Log Request Url ${JSON.stringify(ctx.state.user)}`);

  const userKey = ctx.state.user?.email;
  const contentType = ctx.state.route?.info?.apiName;
  const action = ctx.state.route?.handler?.split('.').pop();

  strapi.log.info(`Permit Check Data 🔐 ${userKey}-${contentType}-${action}`);

  // Skip if required data is missing
  if (!userKey || !contentType || !action) {
    strapi.log.debug('Missing userKey, contentType, or action, skipping RBAC check');
    return;
  }

  let resourceObject = { type: contentType };
  const instanceId = ctx.params;

  strapi.log.info(`Resource Object ${JSON.stringify(resourceObject)}`);
  strapi.log.info(`Instance ID ${JSON.stringify(instanceId)}`);
  try {
    // Perform the RBAC check
    const canPerformAction = await permit.check(userKey, action, contentType);
    strapi.log.info(
      `Permit.io check for user ${userKey}: ${action} on ${contentType} = ${canPerformAction}`
    );

    // Enforce the permission result
    if (!canPerformAction) {
      strapi.log.warn(`User ${userKey} denied ${action} on ${contentType}`);
      return ctx.forbidden(`You are not allowed to ${action} ${contentType}`);
    }
  } catch (error) {
    strapi.log.error(`Error checking permission with Permit.io: ${error.message}`);
    return ctx.internalServerError('Error checking permissions');
  }
};

export default middleware;
