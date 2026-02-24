import type { Core } from '@strapi/strapi';
import { Permit } from 'permitio';
import { debugLog } from '../utils/logger';

const STORE_KEY = 'config';

const RESOURCE_ACTIONS = {
  find:    { name: 'Find' },
  findOne: { name: 'Find One' },
  create:  { name: 'Create' },
  update:  { name: 'Update' },
  delete:  { name: 'Delete' },
};

/** Maps Strapi field types to their Permit.io equivalents. */
const STRAPI_TO_PERMIT_TYPE: Record<string, string> = {
  string: 'string',
  text: 'string',
  richtext: 'string',
  email: 'string',
  uid: 'string',
  enumeration: 'string',
  integer: 'number',
  biginteger: 'number',
  float: 'number',
  decimal: 'number',
  boolean: 'bool',
  date: 'string',
  datetime: 'string',
  time: 'string',
  json: 'json',
};

/** "api::article.article" → "article" */
const extractResourceKey = (uid: string): string =>
  uid.split('::')[1]?.split('.')[0] ?? uid;

const configService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getStore() {
    return strapi.store({ type: 'plugin', name: 'permit-strapi' });
  },

  async getConfig() {
    const store = await this.getStore();
    return store.get({ key: STORE_KEY }) as Promise<{
      apiKey: string;
      pdpUrl: string;
    } | null>;
  },

  async saveConfig({ apiKey, pdpUrl }: { apiKey: string; pdpUrl: string }) {
    const store = await this.getStore();
    await store.set({ key: STORE_KEY, value: { apiKey, pdpUrl } });
  },

  async getExcludedResources(): Promise<string[]> {
    const store = await this.getStore();
    const excluded = await store.get({ key: 'excludedResources' }) as string[] | null;
    return excluded || [];
  },

  async getUserAttributeMappings(): Promise<string[]> {
    const store = await this.getStore();
    const mappings = await store.get({ key: 'userAttributeMappings' }) as string[] | null;
    return mappings || [];
  },

  async saveUserAttributeMappings(mappings: string[]) {
    const store = await this.getStore();
    await store.set({ key: 'userAttributeMappings', value: mappings });
    debugLog(strapi, `[permit-strapi] Saved user attribute mappings: ${JSON.stringify(mappings)}`);
  },

  async getResourceAttributeMappings(): Promise<Record<string, string[]>> {
    const store = await this.getStore();
    const mappings = await store.get({ key: 'resourceAttributeMappings' }) as Record<string, string[]> | null;
    return mappings || {};
  },

  async saveResourceAttributeMappings(mappings: Record<string, string[]>) {
    const store = await this.getStore();
    await store.set({ key: 'resourceAttributeMappings', value: mappings });
    debugLog(strapi, `[permit-strapi] Saved resource attribute mappings: ${JSON.stringify(mappings)}`);
  },

  /** ReBAC config keyed by CT UID: `{ "api::post.post": { enabled: true, creatorRole: "owner" } }` */
  async getRebacConfig(): Promise<Record<string, { enabled: boolean; creatorRole: string }>> {
    const store = await this.getStore();
    const config = await store.get({ key: 'rebacConfig' }) as Record<string, { enabled: boolean; creatorRole: string }> | null;
    return config || {};
  },

  async saveRebacConfig(config: Record<string, { enabled: boolean; creatorRole: string }>) {
    const store = await this.getStore();
    await store.set({ key: 'rebacConfig', value: config });
    debugLog(strapi, `[permit-strapi] Saved ReBAC config: ${JSON.stringify(config)}`);
  },

  /** Converts mapped Strapi CT fields into the Permit.io attribute schema format. */
  buildAttributeSchema(ctUid: string, mappedFields: string[]): Record<string, { type: string; description: string }> {
    const ct = strapi.contentTypes[ctUid] as any;
    if (!ct || !ct.attributes || mappedFields.length === 0) return {};

    const schema: Record<string, { type: string; description: string }> = {};
    for (const field of mappedFields) {
      const attr = ct.attributes[field];
      if (!attr) continue;
      const permitType = STRAPI_TO_PERMIT_TYPE[attr.type];
      if (!permitType) continue;
      schema[field] = {
        type: permitType,
        description: `${field} (${attr.type})`,
      };
    }
    return schema;
  },

  /** Upserts all non-excluded CTs as Permit.io resources. Safe to call on every bootstrap. */
  async syncResourcesToPermit(excludedResources: string[]) {
    const permit = (strapi as any).permit;
    if (!permit) return;

    const resourceAttrMappings = await this.getResourceAttributeMappings();

    const contentTypes = Object.values(strapi.contentTypes)
      .filter((ct: any) => ct.kind === 'collectionType' && ct.uid.startsWith('api::'))
      .map((ct: any) => ({
        uid: ct.uid as string,
        displayName: (ct.info?.displayName || ct.uid) as string,
        key: extractResourceKey(ct.uid),
      }));

    for (const ct of contentTypes) {
      if (excludedResources.includes(ct.uid)) continue;

      const mappedFields = resourceAttrMappings[ct.uid] || [];
      const attributes = this.buildAttributeSchema(ct.uid, mappedFields);

      try {
        await permit.api.resources.get(ct.key);
        await permit.api.resources.update(ct.key, {
          name: ct.displayName,
          actions: RESOURCE_ACTIONS,
          attributes,
        });
        debugLog(strapi, `[permit-strapi] Updated resource: ${ct.key}`);
      } catch {
        try {
          await permit.api.resources.create({
            key: ct.key,
            name: ct.displayName,
            actions: RESOURCE_ACTIONS,
            attributes,
          });
          debugLog(strapi, `[permit-strapi] Created resource: ${ct.key}`);
        } catch (createError) {
          strapi.log.error(`[permit-strapi] Failed to sync resource ${ct.key}: ${createError.message}`);
        }
      }
    }
  },

  async saveExcludedResources(excludedResources: string[]) {
    const oldExcluded = await this.getExcludedResources();
    const store = await this.getStore();
    await store.set({ key: 'excludedResources', value: excludedResources });

    const permit = (strapi as any).permit;
    if (!permit) return;

    const resourceAttrMappings = await this.getResourceAttributeMappings();

    // Newly excluded — remove from Permit.io
    const newlyExcluded = excludedResources.filter((uid) => !oldExcluded.includes(uid));
    for (const uid of newlyExcluded) {
      const key = extractResourceKey(uid);
      try {
        await permit.api.resources.delete(key);
        debugLog(strapi, `[permit-strapi] Deleted resource: ${key}`);
      } catch (error) {
        strapi.log.warn(`[permit-strapi] Could not delete resource ${key}: ${error.message}`);
      }
    }

    // Newly protected — create in Permit.io
    const newlyProtected = oldExcluded.filter((uid) => !excludedResources.includes(uid));
    for (const uid of newlyProtected) {
      const ct = strapi.contentTypes[uid] as any;
      if (!ct) continue;
      const key = extractResourceKey(uid);
      const displayName = ct.info?.displayName || key;
      const mappedFields = resourceAttrMappings[uid] || [];
      const attributes = this.buildAttributeSchema(uid, mappedFields);

      try {
        await permit.api.resources.get(key);
        await permit.api.resources.update(key, {
          name: displayName,
          actions: RESOURCE_ACTIONS,
          attributes,
        });
        debugLog(strapi, `[permit-strapi] Updated resource: ${key}`);
      } catch {
        try {
          await permit.api.resources.create({
            key,
            name: displayName,
            actions: RESOURCE_ACTIONS,
            attributes,
          });
          debugLog(strapi, `[permit-strapi] Created resource: ${key}`);
        } catch (createError) {
          strapi.log.error(`[permit-strapi] Failed to create resource ${key}: ${createError.message}`);
        }
      }
    }
  },

  /**
   * Validates the API key against Permit.io, saves the config, reinitializes
   * the shared Permit instance, and syncs all non-excluded resources.
   */
  async validateAndSave({ apiKey, pdpUrl }: { apiKey: string; pdpUrl: string }) {
    const permit = new Permit({ token: apiKey, pdp: pdpUrl });

    try {
      await permit.api.projects.list();
    } catch (error) {
      strapi.log.error(`[permit-strapi] API key validation failed: ${error.message}`);
      throw new Error('Invalid API key. Please check your Permit.io credentials.');
    }

    await this.saveConfig({ apiKey, pdpUrl });

    (strapi as any).permit = new Permit({ token: apiKey, pdp: pdpUrl });

    const excludedResources = await this.getExcludedResources();
    await this.syncResourcesToPermit(excludedResources);

    return { success: true };
  },
});

export default configService;
