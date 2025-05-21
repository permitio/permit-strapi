import type { Core } from '@strapi/strapi';
import { Permit } from 'permitio';
import { parseUsername } from '../utils/user';

export interface SyncUserResult {
  success: boolean;
  message: string;
  permitUser?: any;
}

const syncUserService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Sync a user to Permit.io
   */
  async syncUser(userId: number): Promise<SyncUserResult> {
    try {
      // Get Permit client
      const permitClient = await strapi.plugin('permit-strapi').service('service').getClient();

      // Fetch user from Strapi
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId },
        populate: { role: true },
      });

      strapi.log.info(`User fetched from Strapi - ${JSON.stringify(user)}`);

      if (!user) {
        return {
          success: false,
          message: `User with ID ${userId} not found`,
        };
      }

      const { first_name, last_name } = parseUsername(user.username || '');
      // Format user for Permit.io - create a stable key using Strapi's user ID

      const defaultFields = [
        'id',
        'documentId',
        'username',
        'email',
        'provider',
        'password',
        'resetPasswordToken',
        'confirmationToken',
        'confirmed',
        'blocked',
        'createdAt',
        'updatedAt',
        'publishedAt',
        'locale',
        'role',
      ];

      const customAttributes = {};
      Object.keys(user).forEach((key) => {
        if (!defaultFields.includes(key) && user[key] !== undefined && user[key] !== null) {
          customAttributes[key] = user[key];
        }
      });
      const permitUser = {
        key: `strapi-user-${user.id}`,
        email: user.email,
        first_name,
        last_name,
        attributes: customAttributes,
      };

      // Sync user to Permit.io
      const syncedUser = await permitClient.api.syncUser(permitUser);

      strapi.log.info(`User Synced to Permit - ${JSON.stringify(syncedUser)}`);

      if (user.role && user.role.id) {
        const permitRoleKey = `strapi-role-${user.role.id}`;
        const assignedRole = {
          role: permitRoleKey,
          tenant: 'default',
          user: permitUser.key,
        };

        await permitClient.api.assignRole(assignedRole);
        strapi.log.info(`Role ${permitRoleKey} assigned to user ${permitUser.key} in Permit.io`);
      }

      return {
        success: true,
        message: 'User successfully synchronized with Permit.io',
        permitUser: syncedUser,
      };
    } catch (error) {
      strapi.log.error('Error syncing user to Permit:', error);
      return {
        success: false,
        message: `Failed to sync user: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export default syncUserService;
