// export default async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
//   const { ctx } = policyContext;
//   strapi.log.info(`Policy Context ${ctx}`);
//   const user = ctx.state.user;
//   if (!user) return false;
//   return true;
// };

// src/plugins/permit-strapi/server/policies/permitPolicy.ts
import { errors } from '@strapi/utils';
const { PolicyError } = errors;

export default async (policyContext, config, { strapi }) => {
  const { user, route } = policyContext.state;

  if (!user) {
    return policyContext.unauthorized('User is not authenticated');
  }

  const handlerParts = route.handler.split('.');
  const contentType = route.info.apiName || handlerParts[1];
  const strapiAction = handlerParts[handlerParts.length - 1];

  const actionMap = {
    find: 'read',
    findOne: 'read',
    create: 'create',
    update: 'update',
    delete: 'delete',
    publish: 'publish',
    unpublish: 'unpublish',
  };

  const action = actionMap[strapiAction] || strapiAction;
  const resourceKey = `strapi-${contentType}`;
  const userKey = `strapi-user-${user.id}`;

  strapi.log.info(`[Permit.io] Checking permission for ${userKey} to ${action} on ${resourceKey}`);

  try {
    const permitClient = await strapi.plugin('permit-strapi').service('configService').getClient();

    const permitted = await permitClient.check(userKey, action, resourceKey);

    strapi.log.info(`[Permit.io] Permit client check result: ${permitted}`);

    if (!permitted) {
      strapi.log.warn(`[Permit.io] ${userKey} NOT permitted to ${action} ${resourceKey}}`);
      policyContext.response.status = 403;
      policyContext.response.body = {
        data: null,
        error: {
          status: 403,
          name: 'PolicyError',
          message: `You're not allowed to ${action} this resource`,
          details: {},
        },
      };
      return false;
    }
    strapi.log.info(`[Permit.io] ${userKey} permitted to ${action} ${resourceKey}`);
    return true;
  } catch (error) {
    strapi.log.error(`[Permit.io] Error in permitPolicy: ${error.message}`);
    // return policyContext.internalServerError('Internal Server Error');
  }
};
