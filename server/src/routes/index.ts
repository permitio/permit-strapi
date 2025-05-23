import healthRoutes from './health.routes';
import configRoutes from './config.routes';
import contentTypesRoutes from './content-types.routes';
import syncStatusRoutes from './sync-status.routes';
import userRoutes from './users.routes';

export default [
  ...healthRoutes,
  ...configRoutes,
  ...contentTypesRoutes,
  ...syncStatusRoutes,
  ...userRoutes,
];
