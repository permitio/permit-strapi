import healthRoutes from './health.routes';
import configRoutes from './config.routes';
import contentTypesRoutes from './content-types.routes';

export default [...healthRoutes, ...configRoutes, ...contentTypesRoutes];
