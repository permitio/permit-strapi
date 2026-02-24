# permit-strapi

A Strapi 5 plugin that connects your Strapi application to [Permit.io](https://permit.io) for fine-grained access control. It supports RBAC, ABAC, and ReBAC out of the box, and enforces authorization on every API request without you having to touch your controllers.

## What it does

By default, Strapi's built-in permissions work at the role level — a role either has access to a content type or it doesn't. This plugin adds a second enforcement layer that sits between the request and your controllers, giving you much more control over who can access what and under what conditions.

Once installed and connected, the plugin:

- Intercepts all `/api/` requests that carry a Bearer token
- Verifies the token and identifies the user
- Calls Permit.io to check if the user is allowed to perform the action on that resource
- Returns a 403 if the check fails, or passes the request through if it succeeds

Your existing Strapi setup does not need to change. The plugin registers a global middleware that handles enforcement automatically.

## Requirements

- Strapi 5
- Node.js 22 (Node 23 is not supported by Strapi)
- A [Permit.io](https://permit.io) account
- For ABAC and ReBAC: a self-hosted Permit.io PDP. The cloud PDP only supports RBAC.

## Running a self-hosted PDP

If you plan to use ABAC or ReBAC, you need a self-hosted PDP. The quickest way to run one locally is with Docker:

```bash
docker run -p 7766:7000 \
  --env PDP_API_KEY=<your-permit-api-key> \
  permitio/pdp-v2:latest
```

Use `http://localhost:7766` as the PDP URL when configuring the plugin.

## Installation

```bash
npm install permit-strapi
```

After installing, restart your Strapi server. The plugin will appear in the admin sidebar under the Permit.io section.

## Getting started

1. Open the plugin in the Strapi admin panel
2. Enter your Permit.io API key and PDP URL
3. Click Connect — the plugin will validate the key and sync your content types and roles to Permit.io automatically

From there, you can configure which content types are protected, set up attribute mappings for ABAC, or enable ReBAC per content type.

## How authorization works

The plugin uses a two-layer model:

**Layer 1 — Strapi Users & Permissions**: controls which roles have access to which endpoints at all. You should grant full access per role here and let the plugin handle the fine-grained enforcement.

**Layer 2 — Permit.io middleware**: calls `permit.check()` on every request with the user identity, the action (find, findOne, create, update, delete), and the resource. Permit.io evaluates your policy and returns allow or deny.

Both layers must pass for a request to go through.

## RBAC

Role-based access control is the default mode. When you connect the plugin, it syncs your Strapi roles to Permit.io. User role assignments are kept in sync automatically — when a user is created, updated, or deleted in Strapi, the plugin reflects those changes in Permit.io in real time.

To configure RBAC policies, use the Permit.io dashboard to set which roles can perform which actions on which resources.

## ABAC

Attribute-based access control lets you write policies based on properties of the user or the resource. For example: only users in the `us` region can access products with `region: us`, or only users with `clearance: elevated` can access confidential records.

To enable ABAC:

1. Make sure you are using a self-hosted PDP
2. Open the plugin's ABAC Attribute Mapping section
3. Select which user fields to include as user attributes (e.g. `region`, `department`)
4. Select which fields on each content type to include as resource attributes (e.g. `region`, `confidential`)
5. Save — the plugin will re-sync the resource schemas to Permit.io

The plugin fetches user and resource attributes at request time and passes them to `permit.check()`. For list endpoints (`GET /api/posts`), only user attributes are passed since there is no single resource to evaluate. For single-resource endpoints (`GET /api/posts/:id`), both user and resource attributes are included.

You configure the actual access rules (user sets, resource sets, condition set rules) in the Permit.io dashboard.

## ReBAC

Relationship-based access control ties permissions to the relationship between a user and a specific record. For example: a user can edit a document because they created it, or they can view it because someone shared it with them.

To enable ReBAC for a content type:

1. Open the ReBAC Configuration section in the plugin
2. Enable ReBAC for the content type
3. Set the creator role — the role assigned to users when they create a record (defaults to `owner`)
4. Define instance roles — the roles that can be assigned on individual records (e.g. owner, editor, viewer)
5. Save the roles — they will be synced to Permit.io as resource roles
6. Use the Sync Instances button to push all existing records to Permit.io as resource instances

New records are synced to Permit.io as resource instances automatically when created. Deleted records are removed from Permit.io automatically.

One thing to be aware of: automatic creator role assignment is not yet implemented. When a record is created, the instance exists in Permit.io but no relationship is assigned to the creator. You need to assign instance roles manually from the Permit.io dashboard or via the Permit.io API after creation.

## Syncing users

New users are synced to Permit.io automatically when they register. If you have existing users, use the Sync All Users button in the User Sync section to push them to Permit.io in bulk.

## Protected resources

By default, all content types are protected. You can toggle individual content types off in the Protected Resources section if you want Permit.io enforcement to skip them entirely.

## Fail open behavior

If the Permit.io client is not initialized or if the PDP is unreachable, all requests pass through without enforcement. This means a misconfigured or disconnected plugin will not break your API — it just stops enforcing until you reconnect.

## Contributing

The plugin uses [yalc](https://github.com/wclr/yalc) for local linking during development.

In the plugin directory:

```bash
npm install --legacy-peer-deps
npm run watch:link
```

In your Strapi project:

```bash
npx yalc add permit-strapi
npx yalc link permit-strapi
npm install
nvm use 22
npm run develop
```

## License

MIT
