/**
 * The middleware function previously created
 * is imported from its file and
 * exported by the middlewares index.
 */
// import middleware from './permit-rbac';
// import middleware from './permit-check';

// export default {
//   middleware,
// };

import permitCheck from './permit-check';

export default {
  'permit-check': permitCheck,
};
