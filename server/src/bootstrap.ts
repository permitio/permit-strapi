import type { Core } from '@strapi/strapi';
import middlewares from './middlewares';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  // bootstrap phase
  // strapi.server.use(middlewares.middleware);
};

export default bootstrap;
