export default [
  {
    method: 'POST',
    path: '/users',
    handler: 'usersController.syncUsers',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/users',
    handler: 'usersController.getUsers',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
];
