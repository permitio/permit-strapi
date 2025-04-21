import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  index(ctx) {
    ctx.body = strapi.plugin('strapi-permit-auth').service('service').getWelcomeMessage();
  },

  async saveConfig(ctx) {
    try {
      const { pdp, token } = ctx.request.body;

      if (!pdp || !token) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Missing required fields: pdpUrl and apiKey are required',
        };
        return;
      }
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const config = await pluginStore.set({
        key: 'config',
        value: {
          pdp,
          token,
        },
      });

      strapi.log.info(`Saving Configuration to Store ${config}`);

      ctx.body = {
        success: true,
        message: 'Configuration saved successfully',
        config,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error saving configuration',
      };
    }
  },

  async getConfig(ctx) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const config = (await pluginStore.get({ key: 'config' })) as any;
      strapi.log.info(`Logging Fetched Configuration from Store ${JSON.stringify(config)}`);

      if (!config) {
        ctx.body = {
          success: true,
          config: {
            pdp: '',
            token: '',
          },
        };
        return;
      }

      ctx.body = {
        success: true,
        config: {
          pdp: config.pdp,
          token: config.token ? `${config.token.substring(0, 8)}********` : '',
        },
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error retrieving configuration',
      };
    }
  },

  async updateConfig(ctx) {
    try {
      const { pdp, token } = ctx.request.body;

      if (!pdp && !token) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'At least one field (pdpUrl or apiKey) is required for update',
        };
        return;
      }

      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const currentConfig: any = (await pluginStore.get({ key: 'config' })) || {
        pdp: '',
        token: '',
      };
      strapi.log.info(`Fetched Config from Store ${JSON.stringify(currentConfig)}`);
      const updatedConfig = {
        ...currentConfig,
        ...(pdp !== undefined && { pdp }),
        ...(token !== undefined && { token }),
      };

      const config = await pluginStore.set({
        key: 'config',
        value: updatedConfig,
      });

      strapi.log.info(`Updating Configuration in Store: ${JSON.stringify(config)}`);

      ctx.body = {
        success: true,
        message: 'Configuration updated successfully',
        config,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error updating configuration',
      };
    }
  },

  async deleteConfig(ctx) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const existingConfig = await pluginStore.get({ key: 'config' });

      if (!existingConfig) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Configuration not found',
        };
        return;
      }
      await pluginStore.delete({ key: 'config' });

      ctx.body = {
        success: true,
        message: 'Configuration successfully deleted',
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error deleting configuration',
      };
    }
  },

  async getUsers(ctx) {
    try {
      const adminUsers = await strapi.db.query('admin::user').findMany({
        populate: ['roles'],
      });

      const sanitizedUsers = adminUsers.map((user) => ({
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        roles: user.roles
          ? user.roles.map((role) => ({
              id: role.id,
              code: role.code,
              name: role.name,
            }))
          : [],
        createdAt: user.createdAt,
      }));
      strapi.log.info(`Fetched Admin Users ${JSON.stringify(sanitizedUsers)}`);

      ctx.body = {
        success: true,
        data: sanitizedUsers,
        total: sanitizedUsers.length,
      };
    } catch (error) {
      strapi.log.error('Error fetching users:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error fetching users',
      };
    }
  },

  async syncUsers(ctx) {
    try {
      const { users } = ctx.request.body;

      if (!users || !Array.isArray(users)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Invalid request: users must be an array',
        };
        return;
      }

      const result = await strapi.plugin('strapi-permit-auth').service('service').syncUsers(users);

      ctx.body = {
        success: true,
        message: 'Users synced successfully',
        data: result,
      };
    } catch (error) {
      strapi.log.error('Error syncing users:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error syncing users',
      };
    }
  },

  async getSyncedUsers(ctx) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const syncedUsers: any = (await pluginStore.get({ key: 'permit_synced_users' })) || [];

      ctx.body = {
        success: true,
        data: syncedUsers,
        total: syncedUsers.length,
      };
    } catch (error) {
      strapi.log.error('Error retrieving synced users:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error retrieving synced users',
      };
    }
  },

  async deleteSyncedUsers(ctx) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const syncedUsers = await pluginStore.get({ key: 'permit_synced_users' });
      strapi.log.info(`Fetched Synced User = ${JSON.stringify(syncedUsers)}`);
      if (!syncedUsers) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'No synced users found to delete',
        };
        return;
      }

      await pluginStore.delete({ key: 'permit_synced_users' });

      ctx.body = {
        success: true,
        message: 'Synced users deleted successfully',
      };
    } catch (error) {
      strapi.log.error('Error deleting synced users:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error deleting synced users',
      };
    }
  },

  async syncRoles(ctx) {
    try {
      const result = await strapi.plugin('strapi-permit-auth').service('service').syncRoles();

      ctx.body = {
        success: true,
        message: 'Roles synced successfully',
        data: result,
      };
    } catch (error) {
      strapi.log.error('Error syncing roles:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error syncing roles',
      };
    }
  },

  async getSyncedRoles(ctx) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const syncedRoles: any = (await pluginStore.get({ key: 'permit_synced_roles' })) || [];

      ctx.body = {
        success: true,
        data: syncedRoles,
        total: syncedRoles.length,
      };
    } catch (error) {
      strapi.log.error('Error retrieving synced roles:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error retrieving synced roles',
      };
    }
  },

  async deleteSyncedRoles(ctx) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const syncedRoles = await pluginStore.get({ key: 'permit_synced_roles' });
      if (!syncedRoles) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'No synced roles found to delete',
        };
        return;
      }

      await pluginStore.delete({ key: 'permit_synced_roles' });

      ctx.body = {
        success: true,
        message: 'Synced roles deleted successfully',
      };
    } catch (error) {
      strapi.log.error('Error deleting synced roles:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error deleting synced roles',
      };
    }
  },

  async getRolesSyncStatus(ctx) {
    try {
      // Fetch all roles from Strapi
      const strapiRoles = await strapi.db.query('admin::role').findMany();
      const strapiRoleKeys = new Set(strapiRoles.map((role) => role.code));

      // Fetch synced roles from strapi.store
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });
      const syncedRoles: any = (await pluginStore.get({ key: 'permit_synced_roles' })) || [];
      const syncedRoleKeys = new Set(syncedRoles.map((role) => role.key));

      // Compare the two sets
      const isSynced =
        strapiRoleKeys.size === syncedRoleKeys.size &&
        [...strapiRoleKeys].every((key) => syncedRoleKeys.has(key));

      ctx.body = {
        success: true,
        data: isSynced,
      };
    } catch (error) {
      strapi.log.error('Error checking roles sync status:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error checking roles sync status',
      };
    }
  },

  async assignRoles(ctx) {
    try {
      const result = await strapi.plugin('strapi-permit-auth').service('service').assignRoles();

      ctx.body = {
        success: true,
        message: 'Roles assigned successfully',
        data: result,
      };
    } catch (error) {
      strapi.log.error('Error assigning roles:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error assigning roles',
      };
    }
  },

  async getAssignedRoles(ctx) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const assignedRoles: any = (await pluginStore.get({ key: 'permit_assigned_roles' })) || [];

      ctx.body = {
        success: true,
        data: assignedRoles,
        total: assignedRoles.length,
      };
    } catch (error) {
      strapi.log.error('Error retrieving assigned roles:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error retrieving assigned roles',
      };
    }
  },

  async deleteAssignedRoles(ctx) {
    try {
      const pluginStore = strapi.store({
        type: 'plugin',
        name: 'strapi-permit-auth',
      });

      const assignedRoles = await pluginStore.get({ key: 'permit_assigned_roles' });
      if (!assignedRoles) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'No assigned roles found to delete',
        };
        return;
      }

      await pluginStore.delete({ key: 'permit_assigned_roles' });

      ctx.body = {
        success: true,
        message: 'Assigned roles deleted successfully',
      };
    } catch (error) {
      strapi.log.error('Error deleting assigned roles:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error deleting assigned roles',
      };
    }
  },
  async syncContentTypes(ctx) {
    try {
      const result = await strapi
        .plugin('strapi-permit-auth')
        .service('service')
        .syncContentTypes();

      ctx.body = {
        success: true,
        message: 'Content types synced successfully',
        data: result,
      };
    } catch (error) {
      strapi.log.error('Error syncing content types:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error syncing content types',
      };
    }
  },

  async syncUsersAttributes(ctx) {
    try {
      const result = await strapi
        .plugin('strapi-permit-auth')
        .service('service')
        .syncUsersAttributes();

      ctx.body = {
        success: true,
        message: 'Syncing users with attributes',
        data: result,
      };
    } catch (error) {
      strapi.log.error('Error syncing users with attributes:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error syncing users with attributes',
      };
    }
  },
  async getCustomUserFields(ctx) {
    try {
      const fields = await strapi
        .plugin('strapi-permit-auth')
        .service('service')
        .getCustomUserFields();

      ctx.body = {
        success: true,
        data: fields,
      };
    } catch (error) {
      strapi.log.error('Error fetching custom user fields:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Error fetching custom user fields',
      };
    }
  },
});

export default controller;
