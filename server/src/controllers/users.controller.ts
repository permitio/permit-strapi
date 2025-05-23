import type { Core } from '@strapi/strapi';
const usersController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getUsers(ctx) {
    try {
      const result = await strapi.plugin('permit-strapi').service('userSync').getUsers();

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, `Failed to get users: ${error.message}`);
    }
  },

  async syncUsers(ctx) {
    try {
      const { userIds } = ctx.request.body;

      if (!userIds || !Array.isArray(userIds)) {
        return ctx.badRequest('userIds array is required');
      }

      const result = await strapi.plugin('permit-strapi').service('userSync').syncUsers(userIds);
      ctx.body = result;
    } catch (error) {
      ctx.throw(500, `Failed to sync users: ${error.message}`);
    }
  },
});

export default usersController;
