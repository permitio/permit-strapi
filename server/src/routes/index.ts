import policies from 'src/policies';

export default [
  {
    method: 'GET',
    path: '/',
    handler: 'controller.index',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/config',
    handler: 'controller.saveConfig',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/config',
    handler: 'controller.getConfig',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'PATCH',
    path: '/config',
    handler: 'controller.updateConfig',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'DELETE',
    path: '/config',
    handler: 'controller.deleteConfig',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/users',
    handler: 'controller.getUsers',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/sync-users',
    handler: 'controller.syncUsers',
    config: {
      policies: [],
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/synced-users',
    handler: 'controller.getSyncedUsers',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'DELETE',
    path: '/synced-users',
    handler: 'controller.deleteSyncedUsers',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/sync-roles',
    handler: 'controller.syncRoles',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/synced-roles',
    handler: 'controller.getSyncedRoles',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'DELETE',
    path: '/synced-roles',
    handler: 'controller.deleteSyncedRoles',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/roles-sync-status',
    handler: 'controller.getRolesSyncStatus',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/assign-roles',
    handler: 'controller.assignRoles',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/assigned-roles',
    handler: 'controller.getAssignedRoles',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'DELETE',
    path: '/assigned-roles',
    handler: 'controller.deleteAssignedRoles',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/sync-content-types',
    handler: 'controller.syncContentTypes',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/sync-users-attributes',
    handler: 'controller.syncUsersAttributes',
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/get-custom-user-fields',
    handler: 'controller.getCustomUserFields',
    config: {
      policies: [],
      auth: false,
    },
  },
];
