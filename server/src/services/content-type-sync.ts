import type { Core } from '@strapi/strapi';
import { extractPermitAttributes } from '../utils/attributes';

export interface SyncContentTypeResult {
  success: boolean;
  message: string;
  permitResource?: any;
}

/**
 * Service to synchronize Strapi content types with Permit.io resources
 */
const contentTypeSync = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Sync all content types to Permit.io as resources
   */
  async syncAllContentTypes(): Promise<{
    success: boolean;
    message: string;
    results: SyncContentTypeResult[];
  }> {
    try {
      const results: SyncContentTypeResult[] = [];
      const contentTypes = strapi.contentTypes;

      for (const contentTypeUid in contentTypes) {
        // Only include user-created content types (api::)
        if (!contentTypeUid.startsWith('api::')) {
          continue;
        }
        strapi.log.info(`Synchronizing content type: ${contentTypeUid}`);
        const result = await this.syncContentType(contentTypeUid);
        results.push(result);
      }

      return {
        success: true,
        message: `Synchronized ${results.length} content types to Permit.io`,
        results,
      };
    } catch (error) {
      strapi.log.error('Error syncing all content types to Permit:', error);
      return {
        success: false,
        message: `Failed to sync content types: ${error instanceof Error ? error.message : String(error)}`,
        results: [],
      };
    }
  },

  /**
   * Sync a single content type to Permit.io as a resource
   */
  async syncContentType(contentTypeUid: string): Promise<SyncContentTypeResult> {
    try {
      // Get Permit client
      const permitClient = await strapi.plugin('permit-strapi').service('service').getClient();

      // Get content type schema
      const contentType = strapi.contentTypes[contentTypeUid];

      if (!contentType) {
        return {
          success: false,
          message: `Content type with UID ${contentTypeUid} not found`,
        };
      }

      // Create a resource key from the content type UID
      const contentTypeInfo = contentTypeUid.split('.');
      const resourceType = contentTypeInfo[contentTypeInfo.length - 1];
      const resourceKey = `strapi-${resourceType}`;

      // Determine if this is a collection or single type
      const kind = contentType.kind || 'collectionType';
      const displayName = contentType.info?.displayName || resourceType;

      // Define standard CRUD actions for this resource
      const actions = {
        create: {},
        read: {},
        update: {},
        delete: {},
      };

      // If this is a single type, remove the create and delete actions
      if (kind === 'singleType') {
        delete actions.create;
        delete actions.delete;
      }

      // If draft/publish is enabled, add publish/unpublish actions
      if (contentType.options?.draftAndPublish) {
        actions['publish'] = {};
        actions['unpublish'] = {};
      }

      const attributes = contentType.__schema__?.attributes || contentType.attributes;
      const permitAttributes = extractPermitAttributes(attributes, displayName);
      strapi.log.info(`Permit attributes extracted: ${JSON.stringify(permitAttributes)}`);
      // Check if resource already exists in Permit.io
      let existingResource;
      try {
        existingResource = await permitClient.api.resources.get(resourceKey);
        strapi.log.info(`Existing resource found in Permit.io: ${existingResource.key}`);
      } catch (error) {
        strapi.log.info(`Resource ${resourceKey} does not exist in Permit.io yet.`);
      }

      let syncedResource;

      if (existingResource) {
        // Update existing resource
        syncedResource = await permitClient.api.updateResource(resourceKey, {
          name: displayName,
          description: contentType.info?.description || `Strapi ${kind}: ${displayName}`,
          actions,
          attributes: permitAttributes,
        });
        strapi.log.info(`Resource updated in Permit.io: ${syncedResource.key}`);
      } else {
        // Create new resource
        syncedResource = await permitClient.api.createResource({
          key: resourceKey,
          name: displayName,
          description: contentType.info?.description || `Strapi ${kind}: ${displayName}`,
          actions,
          attributes: permitAttributes,
        });
        strapi.log.info(`Resource created in Permit.io: ${syncedResource.key}`);
      }

      return {
        success: true,
        message: `Content type ${contentTypeUid} successfully synchronized with Permit.io as resource ${resourceKey}`,
        permitResource: syncedResource,
      };
    } catch (error) {
      strapi.log.error(`Error syncing content type ${contentTypeUid} to Permit:`, error);
      return {
        success: false,
        message: `Failed to sync content type ${contentTypeUid}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  /**
   * Delete a resource from Permit.io when a content type is deleted
   */
  async deleteContentTypeResource(contentTypeUid: string): Promise<SyncContentTypeResult> {
    try {
      // Get Permit client
      const permitClient = await strapi.plugin('permit-strapi').service('service').getClient();

      // Create a resource key from the content type UID
      const contentTypeInfo = contentTypeUid.split('.');
      const resourceType = contentTypeInfo[contentTypeInfo.length - 1];
      const resourceKey = `strapi-${resourceType}`;

      // Delete the resource from Permit.io
      await permitClient.api.deleteResource(resourceKey);

      strapi.log.info(`Resource ${resourceKey} deleted from Permit.io`);

      return {
        success: true,
        message: `Resource ${resourceKey} deleted from Permit.io`,
      };
    } catch (error) {
      strapi.log.error(
        `Error deleting resource for content type ${contentTypeUid} from Permit:`,
        error
      );
      return {
        success: false,
        message: `Failed to delete resource for content type ${contentTypeUid}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export default contentTypeSync;
