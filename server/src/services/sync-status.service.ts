import type { Core } from '@strapi/strapi';

interface SyncStatusResult {
  success: boolean;
  strapi: {
    total: number;
    entities: any[];
  };
  permit: {
    total: number;
    entities: any[];
  };
  synced: {
    total: number;
    percentage: number;
    entities: any[];
  };
  notSynced: {
    total: number;
    entities: any[];
  };
  orphaned: {
    total: number;
    entities: any[];
  };
}

const syncStatusService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get users synchronization status between Strapi and Permit.io
   */
  async getUsersStatus(): Promise<SyncStatusResult> {
    try {
      // Get all users from Strapi
      const strapiUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
        populate: { role: true },
      });

      // Get Permit client
      const permitClient = await strapi
        .plugin('permit-strapi')
        .service('configService')
        .getClient();

      // Get all users from Permit.io that start with 'strapi-user-'
      const permitUsers = await permitClient.api.users.list();
      console.log('permit users', permitUsers);
      const strapiPermitUsers = permitUsers.data.filter(
        (user: any) => user.key && user.key.startsWith('strapi-user-')
      );

      // Create maps for easier comparison
      const strapiUserMap = new Map(strapiUsers.map((user) => [`strapi-user-${user.id}`, user]));
      const permitUserMap = new Map(strapiPermitUsers.map((user: any) => [user.key, user]));

      // Find synced users (exist in both systems)
      const syncedUsers = [];
      const notSyncedUsers = [];

      for (const strapiUser of strapiUsers) {
        const expectedPermitKey = `strapi-user-${strapiUser.id}`;
        if (permitUserMap.has(expectedPermitKey)) {
          syncedUsers.push({
            id: strapiUser.id,
            email: strapiUser.email,
            username: strapiUser.username,
            permitKey: expectedPermitKey,
          });
        } else {
          notSyncedUsers.push({
            id: strapiUser.id,
            email: strapiUser.email,
            username: strapiUser.username,
            expectedPermitKey,
          });
        }
      }

      // Find orphaned users (exist in Permit but not in Strapi)
      const orphanedUsers = [];
      for (const permitUser of strapiPermitUsers) {
        if (!strapiUserMap.has(permitUser.key)) {
          orphanedUsers.push({
            permitKey: permitUser.key,
            email: permitUser.email,
            firstName: permitUser.first_name,
            lastName: permitUser.last_name,
          });
        }
      }

      const syncPercentage =
        strapiUsers.length > 0 ? Math.round((syncedUsers.length / strapiUsers.length) * 100) : 0;

      return {
        success: true,
        strapi: {
          total: strapiUsers.length,
          entities: strapiUsers.map((user) => ({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role?.name,
          })),
        },
        permit: {
          total: strapiPermitUsers.length,
          entities: strapiPermitUsers.map((user: any) => ({
            key: user.key,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
          })),
        },
        synced: {
          total: syncedUsers.length,
          percentage: syncPercentage,
          entities: syncedUsers,
        },
        notSynced: {
          total: notSyncedUsers.length,
          entities: notSyncedUsers,
        },
        orphaned: {
          total: orphanedUsers.length,
          entities: orphanedUsers,
        },
      };
    } catch (error) {
      strapi.log.error('Error getting users sync status:', error);
      return {
        success: false,
        strapi: { total: 0, entities: [] },
        permit: { total: 0, entities: [] },
        synced: { total: 0, percentage: 0, entities: [] },
        notSynced: { total: 0, entities: [] },
        orphaned: { total: 0, entities: [] },
      };
    }
  },

  /**
   * Get roles synchronization status between Strapi and Permit.io
   */
  async getRolesStatus(): Promise<SyncStatusResult> {
    try {
      // Get all roles from Strapi
      const strapiRoles = await strapi.db.query('plugin::users-permissions.role').findMany({
        populate: { permissions: true },
      });

      // Get Permit client
      const permitClient = await strapi
        .plugin('permit-strapi')
        .service('configService')
        .getClient();

      // Get all roles from Permit.io that start with 'strapi-role-'
      const permitRoles = await permitClient.api.roles.list();
      console.log('roles', permitRoles);
      const strapiPermitRoles = permitRoles.filter(
        (role: any) => role.key && role.key.startsWith('strapi-role-')
      );

      // Create maps for easier comparison
      const strapiRoleMap = new Map(strapiRoles.map((role) => [`strapi-role-${role.id}`, role]));
      const permitRoleMap = new Map(strapiPermitRoles.map((role: any) => [role.key, role]));

      // Find synced roles (exist in both systems)
      const syncedRoles = [];
      const notSyncedRoles = [];

      for (const strapiRole of strapiRoles) {
        const expectedPermitKey = `strapi-role-${strapiRole.id}`;
        if (permitRoleMap.has(expectedPermitKey)) {
          syncedRoles.push({
            id: strapiRole.id,
            name: strapiRole.name,
            type: strapiRole.type,
            permitKey: expectedPermitKey,
          });
        } else {
          notSyncedRoles.push({
            id: strapiRole.id,
            name: strapiRole.name,
            type: strapiRole.type,
            expectedPermitKey,
          });
        }
      }

      // Find orphaned roles (exist in Permit but not in Strapi)
      const orphanedRoles = [];
      for (const permitRole of strapiPermitRoles) {
        if (!strapiRoleMap.has(permitRole.key)) {
          orphanedRoles.push({
            permitKey: permitRole.key,
            name: permitRole.name,
            description: permitRole.description,
          });
        }
      }

      const syncPercentage =
        strapiRoles.length > 0 ? Math.round((syncedRoles.length / strapiRoles.length) * 100) : 0;

      return {
        success: true,
        strapi: {
          total: strapiRoles.length,
          entities: strapiRoles.map((role) => ({
            id: role.id,
            name: role.name,
            type: role.type,
            description: role.description,
          })),
        },
        permit: {
          total: strapiPermitRoles.length,
          entities: strapiPermitRoles.map((role: any) => ({
            key: role.key,
            name: role.name,
            description: role.description,
          })),
        },
        synced: {
          total: syncedRoles.length,
          percentage: syncPercentage,
          entities: syncedRoles,
        },
        notSynced: {
          total: notSyncedRoles.length,
          entities: notSyncedRoles,
        },
        orphaned: {
          total: orphanedRoles.length,
          entities: orphanedRoles,
        },
      };
    } catch (error) {
      strapi.log.error('Error getting roles sync status:', error);
      return {
        success: false,
        strapi: { total: 0, entities: [] },
        permit: { total: 0, entities: [] },
        synced: { total: 0, percentage: 0, entities: [] },
        notSynced: { total: 0, entities: [] },
        orphaned: { total: 0, entities: [] },
      };
    }
  },

  /**
   * Get resources (content types) synchronization status between Strapi and Permit.io
   */
  async getResourcesStatus(): Promise<SyncStatusResult> {
    try {
      // Get all user-created content types from Strapi
      const strapiContentTypes = [];
      for (const uid in strapi.contentTypes) {
        if (uid.startsWith('api::')) {
          const contentType = strapi.contentTypes[uid];
          strapiContentTypes.push({
            uid,
            name: contentType.info?.displayName || uid.split('.').pop(),
            description: contentType.info?.description,
            kind: contentType.kind || 'collectionType',
          });
        }
      }

      // Get Permit client
      const permitClient = await strapi
        .plugin('permit-strapi')
        .service('configService')
        .getClient();

      // Get all resources from Permit.io that start with 'strapi-'
      const permitResources = await permitClient.api.resources.list();
      const strapiPermitResources = permitResources.filter(
        (resource: any) => resource.key && resource.key.startsWith('strapi-')
      );

      // Create maps for easier comparison
      const strapiResourceMap = new Map(
        strapiContentTypes.map((ct) => {
          const resourceKey = `strapi-${ct.uid.split('.').pop()}`;
          return [resourceKey, ct];
        })
      );
      const permitResourceMap = new Map(
        strapiPermitResources.map((resource: any) => [resource.key, resource])
      );

      // Find synced resources (exist in both systems)
      const syncedResources = [];
      const notSyncedResources = [];

      for (const strapiContentType of strapiContentTypes) {
        const expectedPermitKey = `strapi-${strapiContentType.uid.split('.').pop()}`;
        if (permitResourceMap.has(expectedPermitKey)) {
          syncedResources.push({
            uid: strapiContentType.uid,
            name: strapiContentType.name,
            permitKey: expectedPermitKey,
          });
        } else {
          notSyncedResources.push({
            uid: strapiContentType.uid,
            name: strapiContentType.name,
            expectedPermitKey,
          });
        }
      }

      // Find orphaned resources (exist in Permit but not in Strapi)
      const orphanedResources = [];
      for (const permitResource of strapiPermitResources) {
        if (!strapiResourceMap.has(permitResource.key)) {
          orphanedResources.push({
            permitKey: permitResource.key,
            name: permitResource.name,
            description: permitResource.description,
          });
        }
      }

      const syncPercentage =
        strapiContentTypes.length > 0
          ? Math.round((syncedResources.length / strapiContentTypes.length) * 100)
          : 0;

      return {
        success: true,
        strapi: {
          total: strapiContentTypes.length,
          entities: strapiContentTypes,
        },
        permit: {
          total: strapiPermitResources.length,
          entities: strapiPermitResources.map((resource: any) => ({
            key: resource.key,
            name: resource.name,
            description: resource.description,
          })),
        },
        synced: {
          total: syncedResources.length,
          percentage: syncPercentage,
          entities: syncedResources,
        },
        notSynced: {
          total: notSyncedResources.length,
          entities: notSyncedResources,
        },
        orphaned: {
          total: orphanedResources.length,
          entities: orphanedResources,
        },
      };
    } catch (error) {
      strapi.log.error('Error getting resources sync status:', error);
      return {
        success: false,
        strapi: { total: 0, entities: [] },
        permit: { total: 0, entities: [] },
        synced: { total: 0, percentage: 0, entities: [] },
        notSynced: { total: 0, entities: [] },
        orphaned: { total: 0, entities: [] },
      };
    }
  },
});

export default syncStatusService;
