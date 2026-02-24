export default () => ({
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/config',
      handler: 'config.saveConfig',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/config',
      handler: 'config.getConfig',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/excluded-resources',
      handler: 'config.getExcludedResources',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/excluded-resources',
      handler: 'config.saveExcludedResources',
      config: { policies: [] },
    },
    {
      method: 'DELETE',
      path: '/config',
      handler: 'config.deleteConfig',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/content-types',
      handler: 'config.getContentTypes',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/sync-users',
      handler: 'config.syncAllUsers',
      config: { policies: [] },
    },
    // ABAC Attribute Mapping Routes
    {
      method: 'GET',
      path: '/user-attribute-mappings',
      handler: 'config.getUserAttributeMappings',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/user-attribute-mappings',
      handler: 'config.saveUserAttributeMappings',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/resource-attribute-mappings',
      handler: 'config.getResourceAttributeMappings',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/resource-attribute-mappings',
      handler: 'config.saveResourceAttributeMappings',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/content-type-fields/:uid',
      handler: 'config.getContentTypeFields',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/user-fields',
      handler: 'config.getUserFields',
      config: { policies: [] },
    },
    // ReBAC Routes
    {
      method: 'GET',
      path: '/rebac-config',
      handler: 'rebac.getRebacConfig',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/rebac-config',
      handler: 'rebac.saveRebacConfig',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/sync-instances/:uid',
      handler: 'rebac.syncInstances',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/instance-roles/:uid',
      handler: 'rebac.getInstanceRoles',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/instance-roles/:uid',
      handler: 'rebac.saveInstanceRoles',
      config: { policies: [] },
    },
  ],
});
