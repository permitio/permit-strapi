import type { Core } from '@strapi/strapi';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // User Synchronization
  strapi.db.lifecycles.subscribe({
    models: ['plugin::users-permissions.user'],

    async afterCreate(event) {
      const { result } = event;

      strapi.log.info(`Created User - ${JSON.stringify(result)}`);
      try {
        await strapi.plugin('permit-strapi').service('userSync').syncUser(result.id);
        strapi.log.info(
          `User ${result.id} automatically synchronized with Permit.io after creation`
        );
      } catch (err) {
        strapi.log.error(`Failed to sync new user ${result.id} with Permit.io:`, err);
      }
    },

    async afterUpdate(event) {
      const { result } = event;

      try {
        await strapi.plugin('permit-strapi').service('userSync').syncUser(result.id);
        strapi.log.info(`User ${result.id} automatically synchronized with Permit.io after update`);
      } catch (err) {
        strapi.log.error(`Failed to sync updated user ${result.id} with Permit.io:`, err);
      }
    },

    async beforeDelete(event) {
      const { where } = event.params;

      if (where && where.id) {
        try {
          const user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: where.id },
          });

          if (user) {
            event.state = {
              permitUserKey: `strapi-user-${user.id}`,
              strapiUserId: user.id,
            };
          }
        } catch (err) {
          strapi.log.error(`Error preparing user ${where.id} for deletion in Permit.io:`, err);
        }
      }
    },

    async afterDelete(event) {
      const { state } = event;

      if (state && state.permitUserKey) {
        try {
          const permitClient = await strapi.plugin('permit-strapi').service('service').getClient();
          await permitClient.api.deleteUser(state.permitUserKey);
          strapi.log.info(
            `User ${state.strapiUserId} (${state.permitUserKey}) deleted from Permit.io after deletion from Strapi`
          );
        } catch (err) {
          strapi.log.error(
            `Failed to delete user ${state.strapiUserId} (${state.permitUserKey}) from Permit.io:`,
            err
          );
        }
      }
    },
  });

  // Role Synchronization
  strapi.db.lifecycles.subscribe({
    models: ['plugin::users-permissions.role'],

    async afterCreate(event) {
      const { result } = event;

      strapi.log.info(`Role Created - ${JSON.stringify(result)}`);
      try {
        await strapi.plugin('permit-strapi').service('roleSync').syncRole(result.id);
        strapi.log.info(
          `Role ${result.id} automatically synchronized with Permit.io after creation`
        );
      } catch (err) {
        strapi.log.error(`Failed to sync new role ${result.id} with Permit.io:`, err);
      }
    },

    async afterUpdate(event) {
      const { result } = event;

      try {
        await strapi.plugin('permit-strapi').service('roleSync').syncRole(result.id);
        strapi.log.info(`Role ${result.id} automatically synchronized with Permit.io after update`);
      } catch (err) {
        strapi.log.error(`Failed to sync updated role ${result.id} with Permit.io:`, err);
      }
    },

    async beforeDelete(event) {
      const { where } = event.params;

      if (where && where.id) {
        try {
          const role = await strapi.db.query('plugin::users-permissions.role').findOne({
            where: { id: where.id },
          });

          if (role) {
            event.state = {
              permitRoleKey: `strapi-role-${role.id}`,
              strapiRoleId: role.id,
              roleType: role.type,
            };
          }
        } catch (err) {
          strapi.log.error(`Error preparing role ${where.id} for deletion in Permit.io:`, err);
        }
      }
    },

    async afterDelete(event) {
      const { state } = event;

      if (state && state.permitRoleKey) {
        try {
          const permitClient = await strapi.plugin('permit-strapi').service('service').getClient();
          await permitClient.api.deleteRole(state.permitRoleKey);
          strapi.log.info(
            `Role ${state.strapiRoleId} (${state.permitRoleKey}) deleted from Permit.io after deletion from Strapi`
          );
        } catch (err) {
          strapi.log.error(
            `Failed to delete role ${state.strapiRoleId} (${state.permitRoleKey}) from Permit.io:`,
            err
          );
        }
      }
    },
  });
};
