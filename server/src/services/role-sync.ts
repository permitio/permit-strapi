import type { Core } from '@strapi/strapi';
import { Permit } from 'permitio';

export interface SyncRoleResult {
  success: boolean;
  message: string;
  permitRole?: any;
}

const roleSyncService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Sync a role to Permit.io
   */
  async syncRole(roleId: number): Promise<SyncRoleResult> {
    try {
      // Get Permit client
      const permitClient = await strapi.plugin('permit-strapi').service('service').getClient();

      // Fetch role from Strapi
      const role = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { id: roleId },
        populate: { permissions: true },
      });

      strapi.log.info(`Role fetched from Strapi - ${JSON.stringify(role)}`);

      if (!role) {
        return {
          success: false,
          message: `Role with ID ${roleId} not found`,
        };
      }

      // Format role for Permit.io - create a stable key using Strapi's role type
      const permitRoleKey = `strapi-role-${role.id}`;

      // Check if role already exists in Permit.io
      let existingRole;
      try {
        existingRole = await permitClient.api.getRole(permitRoleKey);
        strapi.log.info(`Existing role found in Permit.io: ${existingRole.key}`);
      } catch (error) {
        strapi.log.info(`Role ${permitRoleKey} does not exist in Permit.io yet.`);
      }

      let syncedRole;

      if (existingRole) {
        // Update existing role
        syncedRole = await permitClient.api.updateRole(permitRoleKey, {
          name: role.name,
          description: `Strapi ${role.type} role - ${role.description || ''}`,
        });
        strapi.log.info(`Role updated in Permit.io: ${syncedRole.key}`);
      } else {
        // Create new role
        syncedRole = await permitClient.api.createRole({
          key: permitRoleKey,
          name: role.name,
          description: `Strapi ${role.type} role - ${role.description || ''}`,
          permissions: [], // Initial empty permissions, to be assigned later if needed
        });
        strapi.log.info(`Role created in Permit.io: ${syncedRole.key}`);
      }

      return {
        success: true,
        message: 'Role successfully synchronized with Permit.io',
        permitRole: syncedRole,
      };
    } catch (error) {
      strapi.log.error('Error syncing role to Permit:', error);
      return {
        success: false,
        message: `Failed to sync role: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  /**
   * Assign default permissions to a role in Permit.io based on Strapi permissions
   * This is a simplistic approach and should be enhanced based on your specific needs
   */
  //   async syncRolePermissions(roleId: number): Promise<SyncRoleResult> {
  //     try {
  //       // Get Permit client
  //       const permitClient = await strapi.plugin('permit-strapi').service('service').getClient();

  //       // Fetch role from Strapi with permissions
  //       const role = await strapi.db.query('plugin::users-permissions.role').findOne({
  //         where: { id: roleId },
  //         populate: { permissions: true },
  //       });

  //       if (!role) {
  //         return {
  //           success: false,
  //           message: `Role with ID ${roleId} not found`,
  //         };
  //       }

  //       const permitRoleKey = `strapi-role-${role.id}`;

  //       // Map Strapi permissions to Permit.io permissions
  //       // This is a basic implementation and should be expanded based on your needs
  //       const permissions: string[] = [];

  //       // Example: If role has any content-type permissions, add basic CRUD permissions
  //       // This is highly simplified and should be customized
  //       if (role.permissions && role.permissions.length > 0) {
  //         // Add example permissions
  //         // In a real implementation, you would map specific Strapi permissions to Permit permissions
  //         permissions.push('document:read', 'document:create');

  //         // For admin role, add more permissions
  //         if (role.type === 'authenticated') {
  //           permissions.push('document:update', 'document:delete');
  //         }
  //       }

  //       // Assign the permissions to the role in Permit.io
  //       if (permissions.length > 0) {
  //         await permitClient.api.roles.assignPermissions(permitRoleKey, permissions);
  //         strapi.log.info(`Permissions assigned to role ${permitRoleKey} in Permit.io`);
  //       }

  //       return {
  //         success: true,
  //         message: 'Role permissions successfully synchronized with Permit.io',
  //       };
  //     } catch (error) {
  //       strapi.log.error('Error syncing role permissions to Permit:', error);
  //       return {
  //         success: false,
  //         message: `Failed to sync role permissions: ${error instanceof Error ? error.message : String(error)}`,
  //       };
  //     }
  //   },
});

export default roleSyncService;
