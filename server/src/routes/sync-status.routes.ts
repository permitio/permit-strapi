export default [
  {
    method: 'GET',
    path: '/sync-status/users',
    handler: 'syncStatusController.getUsersStatus',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/sync-status/roles',
    handler: 'syncStatusController.getRolesStatus',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/sync-status/resources',
    handler: 'syncStatusController.getResourcesStatus',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
];
