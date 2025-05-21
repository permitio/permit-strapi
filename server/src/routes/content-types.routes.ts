export default [
  {
    method: 'POST',
    path: '/sync/content-types',
    handler: 'contentType.syncAllContentTypes',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/sync/content-type',
    handler: 'contentType.syncContentType',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/content-types',
    handler: 'contentType.getContentTypes',
    config: {
      type: 'admin',
      policies: [],
      auth: false,
    },
  },
];
