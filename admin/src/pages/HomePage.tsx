import { useState, useEffect } from 'react';
import {
  Accordion,
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  Modal,
  Status,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Check, Cross, ExternalLink, Information, Pencil, Plus, Trash } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import styled from 'styled-components';
/// <reference path="../../custom.d.ts" />
import logo from '../assets/logo.png';

const Logo = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 6px;
`;

const SegButton = styled.button<{ $active: boolean; $variant: 'success' | 'danger' }>`
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  background: ${({ $active, $variant }) =>
    $active ? ($variant === 'success' ? '#c6f0c2' : '#fce4e4') : 'transparent'};
  color: ${({ $active, $variant }) =>
    $active ? ($variant === 'success' ? '#2f6846' : '#b72b1a') : '#8e8ea9'};
  &:not(:last-child) {
    border-right: 1px solid #dcdce4;
  }
  &:hover {
    background: ${({ $active, $variant }) =>
      $active
        ? $variant === 'success'
          ? '#c6f0c2'
          : '#fce4e4'
        : '#f6f6f9'};
  }
`;

const TextLink = styled.a`
  color: inherit;
  text-decoration: underline;
  &:hover { opacity: 0.8; }
`;

const DEFAULT_PDP_URL = 'https://cloudpdp.api.permit.io';

interface Config {
  configured: boolean;
  apiKey: string;
  pdpUrl: string;
}

interface ContentType {
  uid: string;
  displayName: string;
  apiID: string;
}

interface FieldInfo {
  name: string;
  type: string;
}

interface HomePageProps {
  onDisconnect: () => void;
}

const HomePage = ({ onDisconnect }: HomePageProps) => {
  const [config, setConfig] = useState<Config | null>(null);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [protectedTypes, setProtectedTypes] = useState<Record<string, boolean>>({});
  const [savingResources, setSavingResources] = useState(false);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; total: number } | null>(null);
  const [updateApiKey, setUpdateApiKey] = useState('');
  const [updatePdpUrl, setUpdatePdpUrl] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [disconnectConfirmed, setDisconnectConfirmed] = useState(false);

  // ReBAC state
  const [rebacConfig, setRebacConfig] = useState<Record<string, { enabled: boolean; creatorRole: string }>>({});
  const [instanceRoles, setInstanceRoles] = useState<Record<string, Array<{ key: string; name: string }>>>({});
  const [savingRebac, setSavingRebac] = useState(false);
  const [savingInstanceRoles, setSavingInstanceRoles] = useState<Record<string, boolean>>({});
  const [syncingInstances, setSyncingInstances] = useState<Record<string, boolean>>({});
  const [instanceSyncResults, setInstanceSyncResults] = useState<Record<string, { synced: number; failed: number; total: number }>>({});

  // ABAC state
  const [userFields, setUserFields] = useState<FieldInfo[]>([]);
  const [userAttrMappings, setUserAttrMappings] = useState<string[]>([]);
  const [savingUserAttrs, setSavingUserAttrs] = useState(false);
  const [resourceFieldsMap, setResourceFieldsMap] = useState<Record<string, FieldInfo[]>>({});
  const [resourceAttrMappings, setResourceAttrMappings] = useState<Record<string, string[]>>({});
  const [savingResourceAttrs, setSavingResourceAttrs] = useState(false);

  const { get, post, del } = useFetchClient();
  const { toggleNotification } = useNotification();

  useEffect(() => {
    fetchConfig();
    fetchContentTypes();
    fetchAttributeMappings();
    fetchRebacConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await get('/permit-strapi/config');
      setConfig(data);
      setUpdatePdpUrl(data.pdpUrl);
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to load configuration' });
    }
  };

  const fetchContentTypes = async () => {
    try {
      const [{ data: ctData }, { data: exData }] = await Promise.all([
        get('/permit-strapi/content-types'),
        get('/permit-strapi/excluded-resources'),
      ]);

      setContentTypes(ctData.contentTypes);

      const initial: Record<string, boolean> = {};
      ctData.contentTypes.forEach((ct: ContentType) => {
        initial[ct.uid] = !exData.excludedResources.includes(ct.uid);
      });
      setProtectedTypes(initial);

      // Fetch fields for each CT (for ABAC resource attributes)
      for (const ct of ctData.contentTypes) {
        fetchContentTypeFields(ct.uid);
      }
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to load content types' });
    }
  };

  const fetchContentTypeFields = async (uid: string) => {
    try {
      const encodedUid = encodeURIComponent(uid);
      const { data } = await get(`/permit-strapi/content-type-fields/${encodedUid}`);
      setResourceFieldsMap((prev) => ({ ...prev, [uid]: data.fields }));
    } catch {
      // Silently fail — fields won't be available for this CT
    }
  };

  const fetchAttributeMappings = async () => {
    try {
      const [{ data: userFieldsData }, { data: userMappingsData }, { data: resourceMappingsData }] =
        await Promise.all([
          get('/permit-strapi/user-fields'),
          get('/permit-strapi/user-attribute-mappings'),
          get('/permit-strapi/resource-attribute-mappings'),
        ]);

      setUserFields(userFieldsData.fields);
      setUserAttrMappings(userMappingsData.mappings);
      setResourceAttrMappings(resourceMappingsData.mappings);
    } catch {
      // Silently fail — ABAC section won't be populated
    }
  };

  const handleUpdateConfig = async () => {
    if (!updateApiKey.trim()) return;
    setUpdateLoading(true);
    try {
      await post('/permit-strapi/config', {
        apiKey: updateApiKey.trim(),
        pdpUrl: updatePdpUrl.trim() || DEFAULT_PDP_URL,
      });
      toggleNotification({ type: 'success', message: 'Configuration updated successfully' });
      fetchConfig();
      setUpdateApiKey('');
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Failed to update configuration';
      toggleNotification({ type: 'danger', message });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnectLoading(true);
    try {
      await del('/permit-strapi/config');
      toggleNotification({ type: 'success', message: 'Disconnected from Permit.io' });
      setDisconnectConfirmed(false);
      onDisconnect();
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to disconnect' });
    } finally {
      setDisconnectLoading(false);
    }
  };

  const handleSyncAllUsers = async () => {
    setSyncingUsers(true);
    setSyncResult(null);
    try {
      const { data } = await post('/permit-strapi/sync-users', {});
      setSyncResult(data);
      toggleNotification({ type: 'success', message: `Synced ${data.synced} of ${data.total} users` });
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to sync users' });
    } finally {
      setSyncingUsers(false);
    }
  };

  const toggleProtection = (uid: string) => {
    setProtectedTypes((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleSaveResources = async () => {
    setSavingResources(true);
    try {
      const excludedResources = Object.entries(protectedTypes)
        .filter(([, isProtected]) => !isProtected)
        .map(([uid]) => uid);

      await post('/permit-strapi/excluded-resources', { excludedResources });
      toggleNotification({ type: 'success', message: 'Protected resources saved successfully' });
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to save protected resources' });
    } finally {
      setSavingResources(false);
    }
  };

  // ABAC handlers
  const toggleUserAttribute = (fieldName: string) => {
    setUserAttrMappings((prev) =>
      prev.includes(fieldName) ? prev.filter((f) => f !== fieldName) : [...prev, fieldName]
    );
  };

  const handleSaveUserAttributes = async () => {
    setSavingUserAttrs(true);
    try {
      await post('/permit-strapi/user-attribute-mappings', { mappings: userAttrMappings });
      toggleNotification({ type: 'success', message: 'User attribute mappings saved. Resources re-synced.' });
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to save user attribute mappings' });
    } finally {
      setSavingUserAttrs(false);
    }
  };

  const toggleResourceAttribute = (uid: string, fieldName: string) => {
    setResourceAttrMappings((prev) => {
      const current = prev[uid] || [];
      const updated = current.includes(fieldName)
        ? current.filter((f) => f !== fieldName)
        : [...current, fieldName];
      return { ...prev, [uid]: updated };
    });
  };

  const handleSaveResourceAttributes = async () => {
    setSavingResourceAttrs(true);
    try {
      await post('/permit-strapi/resource-attribute-mappings', { mappings: resourceAttrMappings });
      toggleNotification({ type: 'success', message: 'Resource attribute mappings saved. Resources re-synced.' });
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to save resource attribute mappings' });
    } finally {
      setSavingResourceAttrs(false);
    }
  };

  // ReBAC handlers
  const fetchRebacConfig = async () => {
    try {
      const { data } = await get('/permit-strapi/rebac-config');
      setRebacConfig(data.config || {});
    } catch {
      // Silently fail
    }
  };

  const fetchInstanceRoles = async (uid: string) => {
    try {
      const encodedUid = encodeURIComponent(uid);
      const { data } = await get(`/permit-strapi/instance-roles/${encodedUid}`);
      setInstanceRoles((prev) => ({ ...prev, [uid]: data.roles || [] }));
    } catch {
      // Silently fail
    }
  };

  const toggleRebacEnabled = (uid: string) => {
    setRebacConfig((prev) => {
      const current = prev[uid] || { enabled: false, creatorRole: 'owner' };
      const updated = { ...current, enabled: !current.enabled };
      if (updated.enabled && !instanceRoles[uid]) {
        fetchInstanceRoles(uid);
      }
      return { ...prev, [uid]: updated };
    });
  };

  const updateCreatorRole = (uid: string, value: string) => {
    setRebacConfig((prev) => ({
      ...prev,
      [uid]: { ...(prev[uid] || { enabled: false, creatorRole: 'owner' }), creatorRole: value },
    }));
  };

  const handleSaveRebacConfig = async () => {
    setSavingRebac(true);
    try {
      await post('/permit-strapi/rebac-config', { config: rebacConfig });
      toggleNotification({ type: 'success', message: 'ReBAC configuration saved' });
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to save ReBAC configuration' });
    } finally {
      setSavingRebac(false);
    }
  };

  const addInstanceRole = (uid: string) => {
    setInstanceRoles((prev) => ({
      ...prev,
      [uid]: [...(prev[uid] || []), { key: '', name: '' }],
    }));
  };

  const updateInstanceRole = (uid: string, index: number, field: 'key' | 'name', value: string) => {
    setInstanceRoles((prev) => {
      const roles = [...(prev[uid] || [])];
      roles[index] = { ...roles[index], [field]: value };
      return { ...prev, [uid]: roles };
    });
  };

  const removeInstanceRole = (uid: string, index: number) => {
    setInstanceRoles((prev) => {
      const roles = [...(prev[uid] || [])];
      roles.splice(index, 1);
      return { ...prev, [uid]: roles };
    });
  };

  const handleSaveInstanceRoles = async (uid: string) => {
    setSavingInstanceRoles((prev) => ({ ...prev, [uid]: true }));
    try {
      const encodedUid = encodeURIComponent(uid);
      const roles = instanceRoles[uid] || [];
      await post(`/permit-strapi/instance-roles/${encodedUid}`, { roles });
      toggleNotification({ type: 'success', message: 'Instance roles saved and synced to Permit.io' });
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to save instance roles' });
    } finally {
      setSavingInstanceRoles((prev) => ({ ...prev, [uid]: false }));
    }
  };

  const handleSyncInstances = async (uid: string) => {
    setSyncingInstances((prev) => ({ ...prev, [uid]: true }));
    try {
      const encodedUid = encodeURIComponent(uid);
      const { data } = await post(`/permit-strapi/sync-instances/${encodedUid}`, {});
      setInstanceSyncResults((prev) => ({ ...prev, [uid]: data }));
      toggleNotification({ type: 'success', message: `Synced ${data.synced} of ${data.total} instances` });
    } catch {
      toggleNotification({ type: 'danger', message: 'Failed to sync instances' });
    } finally {
      setSyncingInstances((prev) => ({ ...prev, [uid]: false }));
    }
  };

  // Protected content types for the ABAC section
  const protectedContentTypes = contentTypes.filter((ct) => protectedTypes[ct.uid] !== false);

  return (
    <Box padding={10}>
      {/* Connection Status Card */}
      <Box
        background="neutral0"
        shadow="tableShadow"
        hasRadius
        padding={6}
        marginBottom={6}
      >
        {/* Row 1 — Logo + Name + Status */}
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
          <Flex gap={3} alignItems="center">
            <Logo src={logo} alt="Permit.io" />
            <Typography variant="delta">Permit.io</Typography>
          </Flex>
          <Status variant="success" size="S">
            <Typography variant="omega" textColor="success700">
              Connected
            </Typography>
          </Status>
        </Flex>

        <Divider />

        {/* Row 2 — Details + Actions */}
        <Flex justifyContent="space-between" alignItems="center" paddingTop={4}>
          <Flex gap={8}>
            <Flex direction="column" gap={1}>
              <Typography variant="sigma" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '10px' }}>
                API KEY
              </Typography>
              <Typography variant="omega">{config?.apiKey}</Typography>
            </Flex>
            <Flex direction="column" gap={1}>
              <Typography variant="sigma" textColor="neutral500" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '10px' }}>
                PDP URL
              </Typography>
              <Flex gap={1} alignItems="center" style={{ lineHeight: 1 }}>
                <Typography variant="omega" style={{ lineHeight: 1 }}>{config?.pdpUrl}</Typography>
                <a href="https://docs.permit.io" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
                  <ExternalLink width="11px" height="11px" fill="neutral400" />
                </a>
              </Flex>
            </Flex>
          </Flex>

          {/* Action Buttons */}
          <Flex gap={2}>
            {/* Update Config Modal */}
            <Modal.Root>
              <Modal.Trigger>
                <Button variant="secondary" startIcon={<Pencil />} size="S">
                  Update Config
                </Button>
              </Modal.Trigger>
              <Modal.Content>
                <Modal.Header>
                  <Modal.Title>Update Configuration</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Box padding={2}>
                    <Flex direction="column" gap={4}>
                      <Field.Root name="updateApiKey" width="100%" hint="Enter a new Permit.io API key to replace the current one">
                        <Field.Label>New API Key</Field.Label>
                        <Field.Hint />
                        <TextInput
                          placeholder="permit_key_..."
                          value={updateApiKey}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUpdateApiKey(e.target.value)
                          }
                          type="password"
                        />
                      </Field.Root>
                      <Field.Root name="updatePdpUrl" width="100%">
                        <Field.Label>PDP URL</Field.Label>
                        <TextInput
                          value={updatePdpUrl}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUpdatePdpUrl(e.target.value)
                          }
                        />
                      </Field.Root>
                      <Flex
                        gap={2}
                        alignItems="flex-start"
                        padding={3}
                        style={{ background: '#f0f4ff', borderRadius: '4px' }}
                      >
                        <Information width="14px" height="14px" fill="primary600" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <Typography variant="pi" textColor="primary600">
                          The Cloud PDP supports <strong>RBAC only</strong>. For ABAC or ReBAC policies, use a{' '}
                          <TextLink
                            href="https://docs.permit.io/how-to/deploy/deploy-to-production"
                            target="_blank"
                            rel="noreferrer"
                          >
                            self-hosted PDP
                          </TextLink>
                          .
                        </Typography>
                      </Flex>
                    </Flex>
                  </Box>
                </Modal.Body>
                <Modal.Footer>
                  <Modal.Close>
                    <Button variant="tertiary" startIcon={<Cross />}>
                      Cancel
                    </Button>
                  </Modal.Close>
                  <Button
                    startIcon={<Check />}
                    onClick={handleUpdateConfig}
                    loading={updateLoading}
                    disabled={!updateApiKey.trim() || updateLoading}
                  >
                    Save Changes
                  </Button>
                </Modal.Footer>
              </Modal.Content>
            </Modal.Root>

            {/* Disconnect Modal */}
            <Modal.Root>
              <Modal.Trigger>
                <Button variant="danger-light" startIcon={<Trash />} size="S">
                  Disconnect
                </Button>
              </Modal.Trigger>
              <Modal.Content>
                <Modal.Header>
                  <Modal.Title>Disconnect from Permit.io</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Flex direction="column" gap={4}>
                    <Typography variant="omega">
                      Are you sure you want to disconnect from Permit.io?
                    </Typography>
                    <Typography variant="omega" textColor="danger600">
                      All API requests will immediately stop being checked for authorization.
                      Your content types will be unprotected until you reconnect.
                    </Typography>
                    <Checkbox
                      checked={disconnectConfirmed}
                      onCheckedChange={(val: boolean) => setDisconnectConfirmed(val)}
                    >
                      I understand the consequences of disconnecting
                    </Checkbox>
                  </Flex>
                </Modal.Body>
                <Modal.Footer>
                  <Modal.Close>
                    <Button variant="tertiary" startIcon={<Cross />}>
                      Cancel
                    </Button>
                  </Modal.Close>
                  <Button
                    variant="danger"
                    startIcon={<Trash />}
                    onClick={handleDisconnect}
                    loading={disconnectLoading}
                    disabled={!disconnectConfirmed || disconnectLoading}
                  >
                    Yes, Disconnect
                  </Button>
                </Modal.Footer>
              </Modal.Content>
            </Modal.Root>
          </Flex>
        </Flex>
      </Box>


      {/* User Sync */}
      <Box background="neutral0" shadow="tableShadow" hasRadius padding={6} marginBottom={6}>
        <Flex justifyContent="space-between" alignItems="center" width="100%">
          <Flex direction="column" gap={1} alignItems="flex-start">
            <Typography variant="delta">User Sync</Typography>
            <Typography variant="omega" textColor="neutral600">
              Sync all existing Strapi users to Permit.io. New users are synced automatically on registration.
            </Typography>
            {syncResult && (
              <Typography variant="pi" textColor="neutral500">
                Last sync: {syncResult.synced} synced, {syncResult.failed} failed (total: {syncResult.total})
              </Typography>
            )}
          </Flex>
          <Button
            variant="secondary"
            size="S"
            onClick={handleSyncAllUsers}
            loading={syncingUsers}
          >
            Sync All Users
          </Button>
        </Flex>
      </Box>

      {/* Protected Resources */}
      <Box background="neutral0" shadow="tableShadow" hasRadius padding={6} marginBottom={6}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4} width="100%">
          <Flex direction="column" gap={1} alignItems="flex-start">
            <Typography variant="delta">Protected Resources</Typography>
            <Typography variant="omega" textColor="neutral600">
              Toggle which content types are protected by Permit.io authorization
            </Typography>
          </Flex>
          <Button
            startIcon={<Check />}
            size="S"
            onClick={handleSaveResources}
            loading={savingResources}
          >
            Save
          </Button>
        </Flex>

        <Divider />

        {contentTypes.length === 0 ? (
          <Box paddingTop={6}>
            <Typography variant="omega" textColor="neutral500">
              No content types found. Create a collection type in the Content-Type Builder first.
            </Typography>
          </Box>
        ) : (
          <Flex direction="column" gap={0} paddingTop={2} width="100%">
            {contentTypes.map((ct, index) => {
              const isProtected = protectedTypes[ct.uid] ?? true;
              return (
                <Box key={ct.uid} width="100%">
                  <Flex alignItems="center" padding={4} style={{ width: '100%' }}>
                    <Box flex={1}>
                      <Typography variant="omega" fontWeight="bold">
                        {ct.displayName}
                      </Typography>
                    </Box>
                    <Flex
                      style={{
                        border: '1px solid #dcdce4',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <SegButton
                        $active={!isProtected}
                        $variant="danger"
                        onClick={() => isProtected && toggleProtection(ct.uid)}
                      >
                        Unprotected
                      </SegButton>
                      <SegButton
                        $active={isProtected}
                        $variant="success"
                        onClick={() => !isProtected && toggleProtection(ct.uid)}
                      >
                        Protected
                      </SegButton>
                    </Flex>
                  </Flex>
                  {index < contentTypes.length - 1 && <Divider />}
                </Box>
              );
            })}
          </Flex>
        )}
      </Box>

      {/* ABAC Attribute Mapping */}
      <Box background="neutral0" shadow="tableShadow" hasRadius padding={6}>
        <Flex direction="column" gap={1} paddingBottom={4} alignItems="flex-start">
          <Typography variant="delta">ABAC Attribute Mapping</Typography>
          <Typography variant="omega" textColor="neutral600">
            Select which fields to pass as attributes for Attribute-Based Access Control.
            Requires a self-hosted PDP.
          </Typography>
        </Flex>

        <Accordion.Root>
          {/* User Attributes */}
          <Accordion.Item value="user-attributes">
            <Accordion.Header>
              <Accordion.Trigger>
                <Typography variant="omega" fontWeight="bold">User Attributes</Typography>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <Box padding={4}>
                {userFields.length === 0 ? (
                  <Typography variant="pi" textColor="neutral500">
                    No custom user fields found. Add fields to the User content type to use as ABAC attributes.
                  </Typography>
                ) : (
                  <Flex direction="column" gap={3} alignItems="flex-start">
                    <Flex gap={4} wrap="wrap">
                      {userFields.map((field) => (
                        <Checkbox
                          key={field.name}
                          checked={userAttrMappings.includes(field.name)}
                          onCheckedChange={() => toggleUserAttribute(field.name)}
                        >
                          <Flex gap={1} alignItems="center">
                            <Typography variant="omega">{field.name}</Typography>
                            <Typography variant="pi" textColor="neutral400">({field.type})</Typography>
                          </Flex>
                        </Checkbox>
                      ))}
                    </Flex>
                    <Button
                      startIcon={<Check />}
                      size="S"
                      onClick={handleSaveUserAttributes}
                      loading={savingUserAttrs}
                      variant="secondary"
                    >
                      Save User Attributes
                    </Button>
                  </Flex>
                )}
              </Box>
            </Accordion.Content>
          </Accordion.Item>

          {/* Resource Attributes */}
          <Accordion.Item value="resource-attributes">
            <Accordion.Header>
              <Accordion.Trigger>
                <Typography variant="omega" fontWeight="bold">Resource Attributes</Typography>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <Box padding={4}>
                {protectedContentTypes.length === 0 ? (
                  <Typography variant="pi" textColor="neutral500">
                    No protected content types. Enable protection for a content type above to configure resource attributes.
                  </Typography>
                ) : (
                  <Flex direction="column" gap={4} alignItems="flex-start">
                    {protectedContentTypes.map((ct) => {
                      const fields = resourceFieldsMap[ct.uid] || [];
                      const selected = resourceAttrMappings[ct.uid] || [];

                      return (
                        <Box key={ct.uid}>
                          <Typography variant="omega" fontWeight="bold">
                            {ct.displayName}
                          </Typography>
                          <Box paddingTop={2} />
                          {fields.length === 0 ? (
                            <Typography variant="pi" textColor="neutral400">
                              No mappable fields
                            </Typography>
                          ) : (
                            <Flex gap={4} wrap="wrap" paddingLeft={2}>
                              {fields.map((field) => (
                                <Checkbox
                                  key={field.name}
                                  checked={selected.includes(field.name)}
                                  onCheckedChange={() => toggleResourceAttribute(ct.uid, field.name)}
                                >
                                  <Flex gap={1} alignItems="center">
                                    <Typography variant="omega">{field.name}</Typography>
                                    <Typography variant="pi" textColor="neutral400">({field.type})</Typography>
                                  </Flex>
                                </Checkbox>
                              ))}
                            </Flex>
                          )}
                        </Box>
                      );
                    })}
                    <Button
                      startIcon={<Check />}
                      size="S"
                      onClick={handleSaveResourceAttributes}
                      loading={savingResourceAttrs}
                      variant="secondary"
                    >
                      Save Resource Attributes
                    </Button>
                  </Flex>
                )}
              </Box>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </Box>
      {/* ReBAC Configuration */}
      <Box background="neutral0" shadow="tableShadow" hasRadius padding={6} marginTop={6}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4} width="100%">
          <Flex direction="column" gap={1} alignItems="flex-start">
            <Typography variant="delta">ReBAC Configuration</Typography>
            <Typography variant="omega" textColor="neutral600">
              Enable Relationship-Based Access Control per content type. Requires a self-hosted PDP.
            </Typography>
          </Flex>
          <Button
            startIcon={<Check />}
            size="S"
            onClick={handleSaveRebacConfig}
            loading={savingRebac}
          >
            Save
          </Button>
        </Flex>

        <Divider />

        {protectedContentTypes.length === 0 ? (
          <Box paddingTop={6}>
            <Typography variant="omega" textColor="neutral500">
              No protected content types. Enable protection above first.
            </Typography>
          </Box>
        ) : (
          <Accordion.Root>
            {protectedContentTypes.map((ct) => {
              const ctRebac = rebacConfig[ct.uid] || { enabled: false, creatorRole: 'owner' };
              const roles = instanceRoles[ct.uid] || [];
              const syncResult = instanceSyncResults[ct.uid];

              return (
                <Accordion.Item key={ct.uid} value={ct.uid}>
                  <Accordion.Header>
                    <Accordion.Trigger>
                      <Flex gap={3} alignItems="center">
                        <Typography variant="omega" fontWeight="bold">{ct.displayName}</Typography>
                        {ctRebac.enabled && (
                          <Typography variant="pi" textColor="success600">(ReBAC enabled)</Typography>
                        )}
                      </Flex>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content>
                    <Box padding={4}>
                      <Flex direction="column" gap={5} alignItems="flex-start">

                        {/* Enable/Disable Toggle */}
                        <Flex alignItems="center" gap={3}>
                          <Typography variant="omega" fontWeight="bold">ReBAC Mode</Typography>
                          <Flex style={{ border: '1px solid #dcdce4', borderRadius: '4px', overflow: 'hidden' }}>
                            <SegButton
                              $active={!ctRebac.enabled}
                              $variant="danger"
                              onClick={() => ctRebac.enabled && toggleRebacEnabled(ct.uid)}
                            >
                              Disabled
                            </SegButton>
                            <SegButton
                              $active={ctRebac.enabled}
                              $variant="success"
                              onClick={() => !ctRebac.enabled && toggleRebacEnabled(ct.uid)}
                            >
                              Enabled
                            </SegButton>
                          </Flex>
                        </Flex>

                        {ctRebac.enabled && (
                          <>
                            {/* Creator Role */}
                            <Field.Root name={`creator-role-${ct.uid}`} width="300px" hint="Role assigned to the user who creates a record">
                              <Field.Label>Creator Role</Field.Label>
                              <Field.Hint />
                              <TextInput
                                placeholder="owner"
                                value={ctRebac.creatorRole}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateCreatorRole(ct.uid, e.target.value)
                                }
                              />
                            </Field.Root>

                            <Divider />

                            {/* Instance Roles */}
                            <Flex direction="column" gap={3} alignItems="flex-start" width="100%">
                              <Typography variant="omega" fontWeight="bold">Instance Roles</Typography>
                              <Typography variant="pi" textColor="neutral500">
                                Define roles that can be assigned to users on specific records (e.g. owner, editor, viewer)
                              </Typography>

                              {roles.length > 0 && (
                                <Flex direction="column" gap={2} width="100%">
                                  {roles.map((role, index) => (
                                    <Flex key={index} gap={2} alignItems="center" width="100%">
                                      <Box flex={1}>
                                        <TextInput
                                          placeholder="key (e.g. owner)"
                                          value={role.key}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updateInstanceRole(ct.uid, index, 'key', e.target.value)
                                          }
                                          aria-label="Role key"
                                        />
                                      </Box>
                                      <Box flex={1}>
                                        <TextInput
                                          placeholder="name (e.g. Owner)"
                                          value={role.name}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updateInstanceRole(ct.uid, index, 'name', e.target.value)
                                          }
                                          aria-label="Role name"
                                        />
                                      </Box>
                                      <Button
                                        variant="danger-light"
                                        size="S"
                                        onClick={() => removeInstanceRole(ct.uid, index)}
                                        startIcon={<Trash />}
                                      >
                                        Remove
                                      </Button>
                                    </Flex>
                                  ))}
                                </Flex>
                              )}

                              <Flex gap={2}>
                                <Button
                                  variant="secondary"
                                  size="S"
                                  startIcon={<Plus />}
                                  onClick={() => addInstanceRole(ct.uid)}
                                >
                                  Add Role
                                </Button>
                                <Button
                                  startIcon={<Check />}
                                  size="S"
                                  onClick={() => handleSaveInstanceRoles(ct.uid)}
                                  loading={savingInstanceRoles[ct.uid]}
                                  disabled={roles.length === 0}
                                >
                                  Save Roles
                                </Button>
                              </Flex>
                            </Flex>

                            <Divider />

                            {/* Sync Instances */}
                            <Flex justifyContent="space-between" alignItems="center" width="100%">
                              <Flex direction="column" gap={1} alignItems="flex-start">
                                <Typography variant="omega" fontWeight="bold">Sync Instances</Typography>
                                <Typography variant="pi" textColor="neutral500">
                                  Bulk sync all existing {ct.displayName} records to Permit.io as resource instances
                                </Typography>
                                {syncResult && (
                                  <Typography variant="pi" textColor="neutral400">
                                    Last sync: {syncResult.synced} synced, {syncResult.failed} failed (total: {syncResult.total})
                                  </Typography>
                                )}
                              </Flex>
                              <Button
                                variant="secondary"
                                size="S"
                                onClick={() => handleSyncInstances(ct.uid)}
                                loading={syncingInstances[ct.uid]}
                              >
                                Sync Instances
                              </Button>
                            </Flex>
                          </>
                        )}
                      </Flex>
                    </Box>
                  </Accordion.Content>
                </Accordion.Item>
              );
            })}
          </Accordion.Root>
        )}
      </Box>
    </Box>
  );
};

export { HomePage };
