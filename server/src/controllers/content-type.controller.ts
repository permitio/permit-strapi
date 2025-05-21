import type { Core } from '@strapi/strapi';

/**
 * Controller for content type related operations
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Sync all content types to Permit.io
   */
  async syncAllContentTypes(ctx) {
    try {
      const result = await strapi
        .plugin('permit-strapi')
        .service('contentTypeSync')
        .syncAllContentTypes();

      if (result.success) {
        ctx.body = {
          success: true,
          message: result.message,
          syncedCount: result.results.length,
          details: result.results,
        };
      } else {
        ctx.throw(500, result.message);
      }
    } catch (error) {
      ctx.throw(500, `Failed to sync content types: ${error.message}`);
    }
  },

  /**
   * Sync a specific content type to Permit.io
   */
  async syncContentType(ctx) {
    try {
      const { uid } = ctx.request.body;

      if (!uid) {
        return ctx.badRequest('Content type UID is required');
      }

      const result = await strapi
        .plugin('permit-strapi')
        .service('contentTypeSync')
        .syncContentType(uid);

      if (result.success) {
        ctx.body = {
          success: true,
          message: result.message,
          details: result.permitResource,
        };
      } else {
        ctx.throw(500, result.message);
      }
    } catch (error) {
      ctx.throw(500, `Failed to sync content type: ${error.message}`);
    }
  },

  /**
   * Get list of available content types
   */
  /**
   * Get list of available content types
   */
  async getContentTypes(ctx) {
    try {
      const controller = strapi.controller('api::blog.blog');
      strapi.log.info('🔐Controller:', controller);
      const actions = Object.keys(controller);

      strapi.log.info('🔑Controller actions:', actions);
      const contentTypes = [];

      for (const uid in strapi.contentTypes) {
        // Only include user-created content types (api::)
        if (!uid.startsWith('api::')) {
          continue;
        }

        const contentType = strapi.contentTypes[uid];
        contentTypes.push({
          uid,
          name: contentType.info?.displayName || uid.split('.').pop(),
          description: contentType.info?.description,
          kind: contentType.kind || 'collectionType',
          draftAndPublish: contentType.options?.draftAndPublish || false,
          i18n: contentType.pluginOptions?.i18n?.localized || false,
        });
      }

      ctx.body = {
        success: true,
        contentTypes,
      };
    } catch (error) {
      ctx.throw(500, `Failed to get content types: ${error.message}`);
    }
  },
});
