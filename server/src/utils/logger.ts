/**
 * Debug logger for permit-strapi.
 *
 * Set PERMIT_STRAPI_DEBUG=true in your environment to enable verbose logging.
 * Logs are suppressed by default so production installs stay quiet.
 */
export const debugLog = (strapi: any, message: string) => {
  if (process.env.PERMIT_STRAPI_DEBUG === 'true') {
    strapi.log.info(message);
  }
};
