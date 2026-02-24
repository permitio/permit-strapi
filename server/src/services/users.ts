import type { Core } from '@strapi/strapi';
import { debugLog } from '../utils/logger';

const DEFAULT_TENANT = 'default';

const usersService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getUserWithRole(userId: number | string) {
    return strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      populate: ['role'],
    });
  },

  /** Returns an object of mapped attribute values from a user record. */
  async extractUserAttributes(user: any): Promise<Record<string, any>> {
    const mappings = await strapi
      .plugin('permit-strapi')
      .service('config')
      .getUserAttributeMappings();

    if (!mappings || mappings.length === 0) return {};

    const attributes: Record<string, any> = {};
    for (const field of mappings) {
      if (user[field] !== undefined && user[field] !== null) {
        attributes[field] = user[field];
      }
    }
    return attributes;
  },

  /**
   * Replaces the user's current Permit.io role assignments with the given role.
   * Unassigns all existing roles first to prevent stale accumulation.
   */
  async syncUserRole(key: string, roleType: string) {
    const permit = (strapi as any).permit;

    const current = await permit.api.users.getAssignedRoles({
      user: key,
      tenant: DEFAULT_TENANT,
    }) as Array<{ role: string }>;

    await Promise.all(
      current.map((assignment) =>
        permit.api.users.unassignRole({
          user: key,
          role: assignment.role,
          tenant: DEFAULT_TENANT,
        })
      )
    );

    await permit.api.users.assignRole({
      user: key,
      role: roleType,
      tenant: DEFAULT_TENANT,
    });

    debugLog(strapi, `[permit-strapi] Assigned role "${roleType}" to user ${key}`);
  },

  /** Syncs a user to Permit.io and assigns their current UP role. */
  async syncUserToPermit(user: any) {
    const permit = (strapi as any).permit;
    if (!permit) return;

    const fullUser = await this.getUserWithRole(user.id);
    if (!fullUser) return;

    const key = `strapi-${fullUser.id}`;
    const attributes = await this.extractUserAttributes(fullUser);

    try {
      await permit.api.users.sync({
        key,
        email: fullUser.email,
        first_name: fullUser.username,
        attributes,
      });
      debugLog(strapi, `[permit-strapi] Synced user: ${key}`);
    } catch (error) {
      strapi.log.error(`[permit-strapi] Failed to sync user ${key}: ${error.message}`);
      return;
    }

    const roleType = fullUser.role?.type;
    if (!roleType || roleType === 'public') return;

    try {
      await this.syncUserRole(key, roleType);
    } catch (error) {
      strapi.log.error(`[permit-strapi] Failed to sync role for user ${key}: ${error.message}`);
    }
  },

  /** Bulk syncs all existing UP users to Permit.io. */
  async syncAllUsers() {
    const permit = (strapi as any).permit;
    if (!permit) throw new Error('Permit.io client not initialized');

    const allUsers = await strapi.db
      .query('plugin::users-permissions.user')
      .findMany({ populate: ['role'] });

    let synced = 0;
    let failed = 0;

    for (const user of allUsers) {
      try {
        await this.syncUserToPermit(user);
        synced++;
      } catch {
        failed++;
      }
    }

    debugLog(strapi, `[permit-strapi] Bulk user sync: ${synced} synced, ${failed} failed`);
    return { synced, failed, total: allUsers.length };
  },

  async deletePermitUser(user: any) {
    const permit = (strapi as any).permit;
    if (!permit) return;

    const key = `strapi-${user.id}`;
    try {
      await permit.api.users.delete(key);
      debugLog(strapi, `[permit-strapi] Deleted user: ${key}`);
    } catch (error) {
      strapi.log.warn(`[permit-strapi] Could not delete user ${key}: ${error.message}`);
    }
  },
});

export default usersService;
