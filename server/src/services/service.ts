import type { Core } from '@strapi/strapi';
import { Permit } from 'permitio';

interface AttributeValue {
  type: string;
}

let permitClient: Permit | null = null;

const initializePermitClient = async () => {
  if (permitClient) return permitClient;

  const pluginStore = strapi.store({
    type: 'plugin',
    name: 'strapi-permit-auth',
  });

  const config: any = await pluginStore.get({ key: 'config' });
  if (!config || !config.token || !config.pdp) {
    throw new Error('Permit.io configuration not found. Please configure the plugin.');
  }

  permitClient = new Permit({
    token: config.token,
    pdp: config.pdp,
  });

  return permitClient;
};

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Strapi 🚀';
  },

  async syncUsers(
    users: Array<{
      key: string;
      email: string;
      first_name?: string;
      last_name?: string;
      selectedAttributes?: string[];
    }>
  ) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const config = (await pluginStore.get({ key: 'config' })) as any;
      strapi.log.info(`Logging Fetched Configuration from Store ${JSON.stringify(config)}`);

      const permitClient = await initializePermitClient();

      strapi.log.info(`User Sent ${JSON.stringify(users)}`);
      const syncedUsers: any = (await pluginStore.get({ key: 'permit_synced_users' })) || [];
      const syncedUserKeys = syncedUsers.map((user) => user.key);

      const syncedResults = [];
      const errors = [];

      for (const user of users) {
        const strapiUser = await strapi.db.query('admin::user').findOne({
          where: { email: user.key },
        });
        const userId = strapiUser?.id;

        strapi.log.info(`Strapi ID Fetch - ${JSON.stringify(strapiUser)}`);
        try {
          // Skip if already synced
          if (syncedUserKeys.includes(user.key)) {
            strapi.log.info(`User ${user.key} already synced, skipping...`);
            syncedResults.push({ key: user.key, status: 'skipped' });
            continue;
          }
          const strapiUser = await strapi.db.query('admin::user').findOne({
            where: { email: user.key },
          });
          const userId = strapiUser?.id;

          strapi.log.info(`Strapi ID Fetch - ${JSON.stringify(strapiUser)}`);

          // Fetch ABAC attributes from plugin::users-permissions.user
          const strapiContentUser = await strapi.db
            .query('plugin::users-permissions.user')
            .findOne({
              where: { email: user.key },
              select: [...(user.selectedAttributes || [])],
            });

          // Build attributes object dynamically based on selectedAttributes
          const attributes = {};
          if (user.selectedAttributes) {
            user.selectedAttributes.forEach((attr) => {
              if (strapiContentUser && strapiContentUser[attr]) {
                attributes[attr] = strapiContentUser[attr];
              }
            });
          }

          // Create user in Permit.io
          const permitSyncedUser = await permitClient.api.syncUser({
            key: user.key,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            attributes: attributes,
          });

          strapi.log.info(`Permit Synced User = ${JSON.stringify(permitSyncedUser)}`);
          // Add to synced users list
          syncedUsers.push({
            key: user.key,
            email: user.email,
            syncedAt: new Date().toISOString(),
          });

          syncedResults.push({ key: user.key, status: 'synced' });
          strapi.log.info(`Successfully synced user ${user.key}`);
        } catch (error) {
          strapi.log.error(`Error syncing user ${user.key}:`, error);
          errors.push({ key: user.key, error: error.message || 'Unknown error' });
          syncedResults.push({ key: user.key, status: 'failed', error: error.message });
        }
      }

      const storedSyncedUsers = await pluginStore.set({
        key: 'permit_synced_users',
        value: syncedUsers,
      });

      strapi.log.info(`Stored Synced Users ${storedSyncedUsers}`);

      return {
        total: users.length,
        synced: syncedResults.filter((result) => result.status === 'synced').length,
        skipped: syncedResults.filter((result) => result.status === 'skipped').length,
        failed: syncedResults.filter((result) => result.status === 'failed').length,
        results: syncedResults,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      strapi.log.error('Error in syncUsers service:', error);
      throw error;
    }
  },
  async syncRoles() {
    try {
      // Fetch Permit.io config from strapi.store
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const config = (await pluginStore.get({ key: 'config' })) as any;

      strapi.log.info(`Stored Config for Permit 🎉🧨 ${JSON.stringify(config)}`);

      const permitClient = new Permit({
        token: config.token,
        pdp: config.pdp,
      });
      // Fetch all roles from Strapi
      const roles = await strapi.db.query('admin::role').findMany();
      strapi.log.info('Fetched Roles:', JSON.stringify(roles));

      // Fetch already synced roles from strapi.store
      const syncedRoles: any = (await pluginStore.get({ key: 'permit_synced_roles' })) || [];
      const syncedRoleKeys = new Set(syncedRoles.map((role) => role.key));

      const uniqueRoles = [];
      const roleKeys = new Set();

      // Ensure uniqueness of roles by key
      for (const role of roles) {
        if (!roleKeys.has(role.code)) {
          roleKeys.add(role.code);
          uniqueRoles.push({
            key: role.code,
            name: role.name,
            description: role.description || '',
            permissions: [],
            extends: [],
          });
        }
      }

      const syncedResults = [];
      const errors = [];

      // Sync unique roles to Permit.io
      for (const role of uniqueRoles) {
        try {
          // Skip if already synced
          if (syncedRoleKeys.has(role.key)) {
            strapi.log.info(`Role ${role.key} already synced, skipping...`);
            syncedResults.push({ key: role.key, status: 'skipped' });
            continue;
          }

          // Create role in Permit.io
          const permitSyncedRoles = await permitClient.api.createRole(role);
          strapi.log.info(`Permit Synced Roles 🚀 - ${permitSyncedRoles}`);

          // Add to synced roles list
          syncedRoles.push({
            key: role.key,
            name: role.name,
            syncedAt: new Date().toISOString(),
          });

          syncedResults.push({ key: role.key, status: 'synced' });
          strapi.log.info(`Successfully synced role ${role.key}`);
        } catch (error) {
          strapi.log.error(`Error syncing role ${role.key}:`, error);
          errors.push({ key: role.key, error: error.message || 'Unknown error' });
          syncedResults.push({ key: role.key, status: 'failed', error: error.message });
        }
      }

      await pluginStore.set({
        key: 'permit_synced_roles',
        value: syncedRoles,
      });
      return {
        total: uniqueRoles.length,
        synced: syncedResults.filter((result) => result.status === 'synced').length,
        skipped: syncedResults.filter((result) => result.status === 'skipped').length,
        failed: syncedResults.filter((result) => result.status === 'failed').length,
        results: syncedResults,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      strapi.log.error('Error in syncRoles service:', error);
      throw error;
    }
    // const roles = await strapi.db.query('admin::role').findMany();
    // strapi.log.info('Fetched Roles:', JSON.stringify(roles));
    // return roles;
  },

  async assignRoles() {
    const pluginStore = strapi.store({
      type: 'plugin',
      name: 'strapi-permit-auth',
    });

    const config: any = await pluginStore.get({ key: 'config' });

    // Initialize Permit.io client
    const permitClient = new Permit({
      token: config.token,
      pdp: config.pdp,
    });

    const adminUsers = await strapi.db.query('admin::user').findMany({
      populate: ['roles'],
    });

    strapi.log.info(`Fetched Admin Users ${JSON.stringify(adminUsers)}`);

    // Fetch already assigned roles from strapi.store
    const assignedRoles: any = (await pluginStore.get({ key: 'permit_assigned_roles' })) || [];
    const assignedKeys = new Set(
      assignedRoles.map((assignment) => `${assignment.user}-${assignment.role}`)
    );

    const assignmentResults = [];
    const errors = [];

    for (const user of adminUsers) {
      const userKey = user.email; // Use email as the user key in Permit.io
      const roles = user.roles || [];

      for (const role of roles) {
        const roleKey = role.code;
        const assignmentKey = `${userKey}-${roleKey}`;

        // Skip if already assigned
        if (assignedKeys.has(assignmentKey)) {
          strapi.log.info(`Role ${roleKey} already assigned to user ${userKey}, skipping...`);
          assignmentResults.push({ user: userKey, role: roleKey, status: 'skipped' });
          continue;
        }

        try {
          await permitClient.api.assignRole({
            role: roleKey,
            tenant: 'default',
            user: userKey,
          });

          // Track the assignment
          assignedRoles.push({
            user: userKey,
            role: roleKey,
            assignedAt: new Date().toISOString(),
          });

          assignmentResults.push({ user: userKey, role: roleKey, status: 'assigned' });
          strapi.log.info(`Successfully assigned role ${roleKey} to user ${userKey}`);
        } catch (error) {
          strapi.log.error(`Error assigning role ${roleKey} to user ${userKey}:`, error);
          errors.push({ user: userKey, role: roleKey, error: error.message || 'Unknown error' });
          assignmentResults.push({
            user: userKey,
            role: roleKey,
            status: 'failed',
            error: error.message,
          });
        }
      }
    }

    // Update the assigned roles list in strapi.store
    await pluginStore.set({
      key: 'permit_assigned_roles',
      value: assignedRoles,
    });

    return {
      total: assignmentResults.length,
      assigned: assignmentResults.filter((result) => result.status === 'assigned').length,
      skipped: assignmentResults.filter((result) => result.status === 'skipped').length,
      failed: assignmentResults.filter((result) => result.status === 'failed').length,
      results: assignmentResults,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  async syncContentTypes() {
    try {
      // Fetch Permit.io config from strapi.store
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      // Initialize Permit.io client
      const permitClient = await initializePermitClient();

      const typeMapping = {
        string: 'string',
        text: 'string',
        richtext: 'string',
        blocks: 'string',
        integer: 'number',
        biginteger: 'number',
        float: 'number',
        decimal: 'number',
        boolean: 'bool',
        json: 'json',
        array: 'array',
        object: 'object',
      };

      const getPermitAttributeType = (strapiType) => {
        return typeMapping[strapiType] || 'String';
      };

      // Fetch API content types
      const contentTypes = Object.values(strapi.contentTypes).filter((ct) =>
        ct.uid.startsWith('api::')
      );

      strapi.log.info(`Content Type 🔥 ${JSON.stringify(contentTypes)}`);

      // Fetch already synced content types from strapi.store
      const syncedContentTypes: any =
        (await pluginStore.get({ key: 'permit_synced_content_types' })) || [];
      const syncedContentTypeKeys = new Set(syncedContentTypes.map((ct) => ct.key));

      const uniqueContentTypes = [];
      const contentTypeKeys = new Set();

      // Define static actions for all content types
      const staticActions = {
        find: { description: 'Find multiple records' },
        findOne: { description: 'Find a single record' },
        create: { description: 'Create a new record' },
        update: { description: 'Update an existing record' },
        delete: { description: 'Delete a record' },
      };

      // Ensure uniqueness of content types by uid
      for (const contentType of contentTypes) {
        if (!contentTypeKeys.has(contentType.uid)) {
          contentTypeKeys.add(contentType.uid);

          const formattedAttributes = {};
          if (contentType.__schema__ && contentType.__schema__.attributes) {
            Object.entries(contentType.__schema__.attributes).forEach(([key, value]) => {
              const strapiType = (value as AttributeValue).type;
              const permitType = getPermitAttributeType(strapiType);
              formattedAttributes[key] = {
                type: permitType,
              };
            });
          }

          strapi.log.info(`Formatted Attributes 🎉 ${JSON.stringify(formattedAttributes)}`);

          uniqueContentTypes.push({
            key: contentType.apiName,
            name: contentType.info.displayName,
            description: `Resource for ${contentType.info.displayName} content type`,
            actions: staticActions,
            attributes: formattedAttributes,
            roles: {},
            relations: {},
          });
        }
      }

      const syncedResults = [];
      const errors = [];

      // Sync unique content types to Permit.io
      for (const contentType of uniqueContentTypes) {
        try {
          // Skip if already synced
          if (syncedContentTypeKeys.has(contentType.key)) {
            strapi.log.info(`Content Type ${contentType.key} already synced, skipping...`);
            syncedResults.push({ key: contentType.key, status: 'skipped' });
            continue;
          }

          // Create resource in Permit.io
          const permitSyncedAttributes = await permitClient.api.createResource(contentType);
          strapi.log.info(`Permit Synced Attributes 🚀 - ${permitSyncedAttributes}`);

          // Add to synced content types list
          syncedContentTypes.push({
            key: contentType.key,
            name: contentType.name,
            syncedAt: new Date().toISOString(),
          });

          syncedResults.push({ key: contentType.key, status: 'synced' });
          strapi.log.info(`Successfully synced content type ${contentType.key}`);
        } catch (error) {
          strapi.log.error(`Error syncing content type ${contentType.key}:`, error);
          errors.push({ key: contentType.key, error: error.message || 'Unknown error' });
          syncedResults.push({ key: contentType.key, status: 'failed', error: error.message });
        }
      }

      // Update the synced content types list in strapi.store
      await pluginStore.set({
        key: 'permit_synced_content_types',
        value: syncedContentTypes,
      });

      return {
        total: uniqueContentTypes.length,
        synced: syncedResults.filter((result) => result.status === 'synced').length,
        skipped: syncedResults.filter((result) => result.status === 'skipped').length,
        failed: syncedResults.filter((result) => result.status === 'failed').length,
        results: syncedResults,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      strapi.log.error('Error in syncContentTypes service:', error);
      throw error;
    }
  },

  async syncUsersAttributes() {
    try {
      // Initialize Permit client if not already done
      const permit = await initializePermitClient();
      if (!permit) {
        throw new Error('Permit.io client initialization failed');
      }

      // Fetch admin users with roles
      const adminUsers = await strapi.db.query('admin::user').findMany({
        populate: ['roles'],
      });

      // Fetch users-permissions users with attributes
      const permissionUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
        populate: ['role'],
      });

      // Fetch already synced users from strapi.store
      const pluginStore = strapi.store({ type: 'plugin', name: 'strapi-permit-auth' });
      const syncedUsers: any = (await pluginStore.get({ key: 'permit_synced_users' })) || [];
      const syncedUserKeys = new Set(syncedUsers.map((user) => user.key));

      // Merge users by matching email
      const usersToSync = adminUsers.map((adminUser) => {
        const permissionUser = permissionUsers.find((pUser) => pUser.email === adminUser.email);
        return {
          key: adminUser.email,
          email: adminUser.email,
          first_name: adminUser.firstname,
          last_name: adminUser.lastname,
          attributes: permissionUser?.attributes || { id: adminUser.id },
          roles: adminUser.roles?.map((role) => role.code) || [],
        };
      });

      // Track sync results
      const syncedResults = [];
      const errors = [];

      for (const user of usersToSync) {
        if (syncedUserKeys.has(user.key)) {
          strapi.log.info(`User ${user.key} already synced, skipping...`);
          syncedResults.push({ key: user.key, status: 'skipped' });
          continue;
        }

        try {
          const permitSyncedUser = await permit.api.syncUser({
            key: user.key,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            attributes: user.attributes,
          });
          strapi.log.info(`Successfully synced user ${user.key}`);
          syncedResults.push({ key: user.key, status: 'synced' });

          // Add to synced users list
          syncedUsers.push({
            key: user.key,
            email: user.email,
            syncedAt: new Date().toISOString(),
          });
          await pluginStore.set({ key: 'permit_synced_users', value: syncedUsers });
        } catch (error) {
          strapi.log.error(`Error syncing user ${user.key}:`, error);
          errors.push({ key: user.key, error: error.message || 'Unknown error' });
          syncedResults.push({ key: user.key, status: 'failed', error: error.message });
        }
      }

      return {
        total: usersToSync.length,
        synced: syncedResults.filter((result) => result.status === 'synced').length,
        skipped: syncedResults.filter((result) => result.status === 'skipped').length,
        failed: syncedResults.filter((result) => result.status === 'failed').length,
        results: syncedResults,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      strapi.log.error('Error in syncUsersAttributes service:', error);
      throw error;
    }
  },

  async getCustomUserFields() {
    const typeMapping = {
      string: 'String',
      text: 'String',
      richtext: 'String',
      blocks: 'String',
      integer: 'Number',
      biginteger: 'Number',
      float: 'Number',
      decimal: 'Number',
      boolean: 'Boolean',
      json: 'Object',
      array: 'Array<Object>',
    };
    try {
      const userContentType = strapi.contentTypes['plugin::users-permissions.user'];
      // strapi.log.info(`User Content Type Fetched = ${JSON.stringify(userContentType)}`);
      // strapi.log.info(
      //   `User Content Type Fetched Attributes 🎉 = ${JSON.stringify(userContentType.attributes)}`
      // );

      // const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      //   select: ['id', 'email', 'department', 'region'],
      //   where: {
      //     email: {
      //       $in: [
      //         'taofiqaiyelabegan45@gmail.com',
      //         'abumahfuz21@gmail.com',
      //         'taofeek2sure@gmail.com',
      //       ],
      //     },
      //   },
      // });

      const contentTypes = Object.values(strapi.contentTypes).filter((ct) =>
        ct.uid.startsWith('api::')
      );

      strapi.log.info(`Fetch Content Types 🔥 ${JSON.stringify(contentTypes)}`);

      const commentContentType = strapi.contentTypes['api::report.report'];

      const getPermitAttributeType = (strapiType) => {
        return typeMapping[strapiType] || 'String'; // Default to String if type not found
      };

      // Then use it when creating formatted attributes
      const formattedAttributes = {};
      const schemaAttributes = contentTypes[0].__schema__.attributes;

      Object.entries(schemaAttributes).forEach(([key, value]: [string, { type: string }]) => {
        formattedAttributes[key] = getPermitAttributeType(value.type);
      });

      strapi.log.info(`Extracted Attributes ✅ ${JSON.stringify(formattedAttributes)}`);

      // strapi.log.info(`Content Type 🔥 ${JSON.stringify(commentContentType)}`);
      const defaultFields = [
        'username',
        'email',
        'provider',
        'password',
        'resetPasswordToken',
        'confirmationToken',
        'confirmed',
        'blocked',
        'role',
        'createdAt',
        'updatedAt',
        'publishedAt',
        'createdBy',
        'updatedBy',
        'locale',
        'localizations',
      ];

      const customFields = Object.keys(userContentType.attributes).filter(
        (field) => !defaultFields.includes(field)
      );

      return customFields;
    } catch (error) {
      strapi.log.error('Error in getCustomUserFields service:', error);
      throw error;
    }
  },
});

export default service;
