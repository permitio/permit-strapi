export default async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const { ctx } = policyContext;
  strapi.log.info(`Policy Context ${ctx}`);
  const user = ctx.state.user;
  if (!user) return false;
  return true;
};
