export default [
  {
    method: 'POST',
    path: '/test-connection',
    handler: 'healthController.testConnection',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/',
    handler: 'healthController.index',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
];
