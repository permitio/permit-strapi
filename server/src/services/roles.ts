import type { Core } from '@strapi/strapi';
import { debugLog } from '../utils/logger';

/** Derives a URL-safe Permit.io role key from a UP role object. */
const getRoleKey = (role: any): string =>
  role.type || role.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const rolesService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getUPRoles() {
    const roles = await strapi.db
      .query('plugin::users-permissions.role')
      .findMany({});
    return roles.filter((role: any) => role.type !== 'public');
  },

  /** Upserts a single UP role to Permit.io. */
  async createOrUpdatePermitRole(role: any) {
    const permit = (strapi as any).permit;
    if (!permit || role.type === 'public') return;

    const key = getRoleKey(role);
    const name = role.name;

    try {
      await permit.api.roles.get(key);
      await permit.api.roles.update(key, { name });
      debugLog(strapi, `[permit-strapi] Updated role: ${key}`);
    } catch {
      try {
        await permit.api.roles.create({ key, name });
        debugLog(strapi, `[permit-strapi] Created role: ${key}`);
      } catch (createError) {
        strapi.log.error(
          `[permit-strapi] Failed to sync role ${key}: ${createError.message}`
        );
      }
    }
  },

  async deletePermitRole(role: any) {
    const permit = (strapi as any).permit;
    if (!permit || role.type === 'public') return;

    const key = getRoleKey(role);
    try {
      await permit.api.roles.delete(key);
      debugLog(strapi, `[permit-strapi] Deleted role: ${key}`);
    } catch (error) {
      strapi.log.warn(
        `[permit-strapi] Could not delete role ${key}: ${error.message}`
      );
    }
  },

  /** Upserts all non-public UP roles to Permit.io. Called on bootstrap. */
  async syncRolesToPermit() {
    const permit = (strapi as any).permit;
    if (!permit) return;

    const roles = await this.getUPRoles();
    for (const role of roles) {
      await this.createOrUpdatePermitRole(role);
    }
  },
});

export default rolesService;
