// async syncContentTypesToPermit(pdpUrl: string, apiKey: string) {
//   try {
//     // 1. Grab user-defined content types
//     const contentTypesArray = Object.values(strapi.contentTypes).filter((ct) =>
//       ct.uid.startsWith('api::')
//     );

//     // 2. Initialize Permit client
//     const permitClient = new Permit({
//       token: apiKey,
//       pdp: pdpUrl,
//     });

//     // 3. Loop and create resources in Permit
//     for (const ct of contentTypesArray) {
//       // Example resource key & name
//       const resourceKey = ct.info?.singularName; // e.g. "api::article.article"
//       console.log('resourceKey', resourceKey);
//       const resourceName = ct.info?.displayName || ct.uid; // e.g. "Article"
//       console.log('resourceName', resourceName);

//       // Create resource with a single "publish" action, just as an example
//       // You can define more actions (read, update, delete, etc.) if desired
//       await permitClient.api.createResource({
//         key: resourceKey,
//         name: resourceName,
//         actions: {
//           publish: {},
//           view: {},
//         },
//         // You could also define 'attributes' or 'roles' if you want
//       });
//     }

//     return {
//       success: true,
//       message: 'Content types synced successfully!',
//       totalSynced: contentTypesArray.length,
//       contentTypes: contentTypesArray.map((ct) => ct.uid),
//     };
//   } catch (error) {
//     strapi.log.error('Error syncing content types:', error);
//     throw error;
//   }
// },

//   async syncContentTypesToPermit(
//     pdpUrl: string,
//     apiKey: string,
//     contentTypesToSync: Array<{ uid: string; actions: string[] }>
//   ) {
//     try {
//       // 1. If no specific content types are provided, sync all user-defined content types
//       const contentTypesArray =
//         contentTypesToSync && contentTypesToSync.length > 0
//           ? contentTypesToSync
//           : Object.values(strapi.contentTypes)
//               .filter((ct) => ct.uid.startsWith('api::'))
//               .map((ct) => ({
//                 uid: ct.uid,
//                 actions: [], // Default to empty actions, will use fallback
//               }));

//       // 2. Initialize Permit client
//       const permitClient = new Permit({
//         token: apiKey,
//         pdp: pdpUrl,
//       });

//       // Default actions if none are provided
//       const defaultActions = ['read', 'create', 'update', 'delete'];

//       strapi.log.info(`Content Types Array ${contentTypesArray}`);

//       // 3. Loop and create resources in Permit
//       for (const ct of contentTypesArray) {
//         // Get the content type from Strapi
//         const contentType = strapi.contentTypes[ct.uid];
//         if (!contentType) {
//           strapi.log.warn(`Content type ${ct.uid} not found, skipping...`);
//           continue;
//         }

//         // Example resource key & name
//         const resourceKey = contentType.info?.singularName || ct.uid.split('.').pop();
//         strapi.log.info(`Resource Key: ${resourceKey}`);
//         const resourceName = contentType.info?.displayName || ct.uid;
//         strapi.log.info(`Resource Name: ${resourceName}`);

//         // Use provided actions or fall back to default
//         const actions = ct.actions && ct.actions.length > 0 ? ct.actions : defaultActions;
//         strapi.log.info(`Actions for ${resourceKey}: ${actions.join(', ')}`);

//         // Dynamically create the actions object for Permit.io
//         const actionsObj = actions.reduce((acc: { [key: string]: any }, action: string) => {
//           acc[action] = {};
//           return acc;
//         }, {});

//         // Create resource in Permit.io
//         await permitClient.api.createResource({
//           key: resourceKey,
//           name: resourceName,
//           actions: actionsObj,
//         });

//         const pluginStore = strapi.store({
//           type: 'plugin',
//           name: 'strapi-permit-auth',
//         });

//         // Store the actions in strapi.store for middleware use
//         const contentTypeConfig = await pluginStore.set({
//           key: 'permit_content_types',
//           value: actions,
//         });
//         strapi.log.info(`Stored actions for ${ct.uid}: ${actions.join(', ')}`);
//         strapi.log.info(`Content Type Config saved ${JSON.stringify(contentTypeConfig)}`);
//       }

//       return {
//         success: true,
//         message: 'Content types synced successfully!',
//         totalSynced: contentTypesArray.length,
//         contentTypes: contentTypesArray.map((ct) => ct.uid),
//       };
//     } catch (error) {
//       strapi.log.error('Error syncing content types:', error);
//       throw error;
//     }
//   },

// async syncAdminUsersWithPermit(pdpUrl: string, apiKey: string) {
//     try {
//       // const contentTypesArray = Object.values(strapi.contentTypes);
//       // strapi.log.info(`Content Types: ${JSON.stringify(contentTypesArray, null, 2)}`);

//       const contentTypesArray = Object.values(strapi.contentTypes).filter((contentType) =>
//         contentType.uid.startsWith('api::')
//       );
//       strapi.log.info(`Content Types: ${JSON.stringify(contentTypesArray, null, 2)}`);
//       strapi.log.info(`Total content types: ${contentTypesArray.length}`);

//       // 1. Fetch all admin users with their roles
//       const adminUsers = await strapi.db.query('admin::user').findMany({
//         populate: ['roles'],
//       });

//       // 2. Initialize Permit client
//       const permitClient = new Permit({
//         token: apiKey,
//         pdp: pdpUrl,
//       });

//       // 3. Loop through each user
//       for (const user of adminUsers) {
//         // a. Sync the user in Permit
//         const syncedUser = await permitClient.api.syncUser({
//           key: user.email, // or user.id.toString(), whichever you prefer
//           email: user.email,
//           first_name: user.firstname,
//           last_name: user.lastname,
//           attributes: {}, // Add ABAC attributes if needed
//         });

//         // b. Assign each role to the user
//         // (If you want to do it in the same step)
//         for (const role of user.roles) {
//           await permitClient.api.roleAssignments.assign({
//             user: user.email,
//             role: role.code, // e.g., "strapi-editor"
//             tenant: 'default', // or any other tenant you want
//           });
//         }
//       }

//       return {
//         success: true,
//         message: 'All admin users synced with Permit!',
//         usersSynced: adminUsers.length,
//       };
//     } catch (error) {
//       strapi.log.error('Error syncing admin users with Permit:', error);
//       throw error;
//     }
//   },

// async initPermit(pdpUrl: string, apiKey: string) {
//     try {
//       const adminUsers = await strapi.db.query('admin::user').findMany({
//         // optionally populate roles
//         populate: ['roles'],
//       });

//       const allRoles = [];

//       // Loop over each user
//       adminUsers.forEach((user) => {
//         // For each user, loop over their roles
//         user.roles.forEach((role) => {
//           allRoles.push({
//             code: role.code,
//             name: role.name,
//             description: role.description,
//           });
//         });
//       });

//       strapi.log.info(`Admin Users: ${allRoles}`);

//       // Optionally remove duplicates (if multiple users share the same role)
//       // You can do this by using a Set or filtering
//       const uniqueRoles = [
//         ...new Map(
//           allRoles.map((r) => [r.code, r]) // key by 'code'
//         ).values(),
//       ];

//       strapi.log.info(`Admin Users: ${uniqueRoles}`);
//       const permitClient = new Permit({
//         token: apiKey,
//         pdp: pdpUrl,
//       });

//       for (const role of uniqueRoles) {
//         await permitClient.api.createRole({
//           key: role.code,
//           name: role.name,
//           description: role.description,
//           // any permissions if you want them
//         });
//       }

//       return {
//         rolesCreated: uniqueRoles.length,
//         roles: uniqueRoles,
//       };
//     } catch (error) {
//       strapi.log.error('Error initializing Permit client:', error);
//       throw error;
//     }
//   },
