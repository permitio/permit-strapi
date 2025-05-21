export default [
  {
    method: 'POST',
    path: '/config',
    handler: 'configController.saveConfig',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/config',
    handler: 'configController.getConfig',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },

  {
    method: 'PUT',
    path: '/config',
    handler: 'configController.updateConfig',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'DELETE',
    path: '/config',
    handler: 'configController.deleteConfig',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
];
