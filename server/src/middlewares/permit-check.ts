const permitCheck = async (ctx: any, next: () => Promise<void>) => {
  await next();

  if (!ctx.request.url.startsWith('/api/')) {
    return;
    // return await next();
  }

  if (!ctx.state || !ctx.state.user) {
    strapi.log.info('No authenticated user found, skipping permission check');
    return;
    // return await next();
  }

  try {
    if (!ctx.state.route) {
      console.log('No route information found, skipping permission check');
      //   return await next();
      return;
    }

    const user = ctx.state.user;
    const handlerParts = ctx.state.route.handler.split('.');
    const contentType = ctx.state.route.info.apiName || handlerParts[1];
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

    console.log(
      `Permit Check Data 🔐 => action - ${action}, resourceKey - ${resourceKey}, userKey - ${userKey}`
    );

    console.log(`Checking permission for user ${userKey} to ${action} on ${resourceKey}`);

    const permitClient = await strapi.plugin('permit-strapi').service('service').getClient();

    const permitted = await permitClient.check(userKey, action, resourceKey);

    if (permitted) {
      console.log(`[Permit.io] User ${userKey} is permitted to ${action} on ${resourceKey}`);
      return await next();
    } else {
      console.log(`[Permit.io] User ${userKey} is NOT permitted to ${action} on ${resourceKey}`);
      return ctx.forbidden(`You don't have permission to ${action} this resource`);
    }
  } catch (error) {
    console.error('[Permit.io] Error in authorization middleware:', error);
    return ctx.throw(500, 'Internal Server Error');
  }
};
export default permitCheck;
