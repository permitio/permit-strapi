import type { Core } from '@strapi/strapi';
import { debugLog } from '../utils/logger';

const DEFAULT_TENANT = 'default';

/** "api::article.article" → "article" */
const extractResourceKey = (uid: string): string =>
  uid.split('::')[1]?.split('.')[0] ?? uid;

const instancesService = ({ strapi }: { strapi: Core.Strapi }) => ({

  async createResourceInstance(uid: string, documentId: string) {
    const permit = (strapi as any).permit;
    if (!permit) return;

    const resourceKey = extractResourceKey(uid);

    try {
      await permit.api.resourceInstances.create({
        resource: resourceKey,
        key: documentId,
        tenant: DEFAULT_TENANT,
      });
      debugLog(strapi, `[permit-strapi] Created resource instance: ${resourceKey}:${documentId}`);
    } catch (error) {
      strapi.log.warn(`[permit-strapi] Could not create resource instance ${resourceKey}:${documentId}: ${error.message}`);
    }
  },

  async deleteResourceInstance(uid: string, documentId: string) {
    const permit = (strapi as any).permit;
    if (!permit) return;

    const resourceKey = extractResourceKey(uid);

    try {
      await permit.api.resourceInstances.delete(`${resourceKey}:${documentId}`);
      debugLog(strapi, `[permit-strapi] Deleted resource instance: ${resourceKey}:${documentId}`);
    } catch (error) {
      strapi.log.warn(`[permit-strapi] Could not delete resource instance ${resourceKey}:${documentId}: ${error.message}`);
    }
  },

  /** Assigns an instance role to a user on a specific resource instance. */
  async assignInstanceRole(userKey: string, role: string, uid: string, documentId: string) {
    const permit = (strapi as any).permit;
    if (!permit) return;

    const resourceKey = extractResourceKey(uid);

    try {
      await permit.api.roleAssignments.assign({
        user: userKey,
        role,
        resource_instance: `${resourceKey}:${documentId}`,
        tenant: DEFAULT_TENANT,
      });
      debugLog(strapi, `[permit-strapi] Assigned role "${role}" to ${userKey} on ${resourceKey}:${documentId}`);
    } catch (error) {
      strapi.log.warn(`[permit-strapi] Could not assign instance role for ${userKey} on ${resourceKey}:${documentId}: ${error.message}`);
    }
  },

  /** Bulk syncs all existing records for a content type as Permit.io resource instances. */
  async syncAllInstances(uid: string) {
    const permit = (strapi as any).permit;
    if (!permit) throw new Error('Permit.io client not initialized');

    const resourceKey = extractResourceKey(uid);
    const records = await strapi.db.query(uid).findMany({});

    let synced = 0;
    let failed = 0;

    for (const record of records) {
      if (!record.documentId) continue;
      try {
        await permit.api.resourceInstances.create({
          resource: resourceKey,
          key: record.documentId,
          tenant: DEFAULT_TENANT,
        });
        synced++;
      } catch {
        failed++;
      }
    }

    debugLog(strapi, `[permit-strapi] Bulk instance sync for ${resourceKey}: ${synced} synced, ${failed} failed`);
    return { synced, failed, total: records.length };
  },
});

export default instancesService;
