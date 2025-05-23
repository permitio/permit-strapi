import type { Core } from '@strapi/strapi';
import { Permit } from 'permitio';
import { parseUsername } from '../utils/user';

export interface SyncUserResult {
  success: boolean;
  message: string;
  permitUser?: any;
}

export interface SyncUsersResult {
  success: boolean;
  message: string;
  totalUsers: number;
  syncedCount: number;
  failedCount: number;
  results: Array<{ userId: number; success: boolean; message: string }>;
}

const syncUserService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Sync a user to Permit.io
   */
  async syncUser(userId: number): Promise<SyncUserResult> {
    try {
      // Get Permit client
      const permitClient = await strapi
        .plugin('permit-strapi')
        .service('configService')
        .getClient();

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

  /**
   * Get all users for manual sync selection
   */
  async getUsers() {
    try {
      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        populate: { role: true },
        select: ['id', 'username', 'email', 'confirmed', 'blocked', 'createdAt'],
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        users: users.map((user) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          roleName: user.role?.name || 'No Role',
          confirmed: user.confirmed,
          blocked: user.blocked,
          createdAt: user.createdAt,
        })),
      };
    } catch (error) {
      strapi.log.error('Error fetching users:', error);
      return {
        success: false,
        message: `Failed to fetch users: ${error instanceof Error ? error.message : String(error)}`,
        users: [],
      };
    }
  },

  /**
   * Sync multiple users to Permit.io
   */
  async syncUsers(userIds: number[]): Promise<SyncUsersResult> {
    const results = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const userId of userIds) {
      try {
        const result = await this.syncUser(userId);
        results.push({
          userId,
          success: result.success,
          message: result.message,
        });

        if (result.success) {
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        results.push({
          userId,
          success: false,
          message: `Failed to sync user: ${error instanceof Error ? error.message : String(error)}`,
        });
        failedCount++;
      }
    }

    return {
      success: true,
      message: `Sync completed: ${syncedCount} successful, ${failedCount} failed`,
      totalUsers: userIds.length,
      syncedCount,
      failedCount,
      results,
    };
  },
});

export default syncUserService;
