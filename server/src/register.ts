// import type { Core } from '@strapi/strapi';
// import middlewares from './middlewares';

// const register = ({ strapi }: { strapi: Core.Strapi }) => {
//   // register phase
//   // Register your middleware globally
//   strapi.server.use(async (ctx, next) => {
//     // Allow the request to continue to other middlewares first
//     // (including authentication)
//     await next();

//     // At this point, authentication has been processed
//     // and ctx.state.user should be available if the user is authenticated
//     // Now you can check permissions
//     strapi.log.info(`Log state route ${JSON.stringify(ctx.state.route)}`);
//     if (ctx.state && ctx.state.user) {
//       // User is authenticated, you can perform permission checks
//       const user = ctx.state.user;

//       // Your permission checking logic here
//       console.log(`Authenticated user: ${JSON.stringify(user)} ${user.id}`);
//     }
//   });
// };

// export default register;

import type { Core } from '@strapi/strapi';
import middlewares from './middlewares';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // Register your middleware
  strapi.server.use(middlewares.middleware);

  strapi.log.info('Permit middleware registered');
};

export default register;
