import React, { useState, useEffect } from 'react';
import { Button, Flex, Typography, Box, Modal, Grid, Status } from '@strapi/design-system';
import { useNotification } from '@strapi/strapi/admin';
import axios from 'axios';
import { SyncUsersModal } from '../components/SyncUsersModal';
import { AssignRolesButton } from '../components/AssignRolesButton';
import { Pencil } from '@strapi/icons';
import { EditConfigModal } from '../components/EditConfigModal';

const Dashboard = () => {
  const { toggleNotification } = useNotification();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [syncingRoles, setSyncingRoles] = useState(false);
  const [rolesSynced, setRolesSynced] = useState(false);
  const [checkingRoleStatus, setCheckingRoleStatus] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Check role sync status when component mounts
  useEffect(() => {
    const checkRoleSyncStatus = async () => {
      setCheckingRoleStatus(true);
      try {
        const { data } = await axios.get('/strapi-permit-auth/roles-sync-status');
        setRolesSynced(data.data === true);
      } catch (error) {
        console.error('Error checking role sync status:', error);
        // If we can't check, assume not synced to allow the action
        setRolesSynced(false);
      } finally {
        setCheckingRoleStatus(false);
      }
    };

    checkRoleSyncStatus();
  }, []);

  const handleSyncRoles = async () => {
    setSyncingRoles(true);
    try {
      const { data } = await axios.post('/strapi-permit-auth/sync-roles');

      if (data.success) {
        toggleNotification({
          type: 'success',
          message: data.message || 'Roles synced successfully',
        });
        // Update status after successful sync
        setRolesSynced(true);
      } else {
        throw new Error(data.message || 'Failed to sync roles');
      }
    } catch (error: any) {
      toggleNotification({
        type: 'warning',
        message: 'Error syncing roles: ' + (error.message || 'Unknown error'),
      });
    } finally {
      setSyncingRoles(false);
    }
  };

  const handleSyncContentTypes = async () => {
    toggleNotification({
      type: 'info',
      message: 'Sync Content Types clicked (not implemented yet)',
    });
  };

  return (
    <>
      <Flex
        direction="column"
        justifyContent="center"
        alignItems="center"
        style={{ height: '100vh', position: 'relative' }}
      >
        <EditConfigModal style={{ position: 'absolute', top: '5rem', right: '3rem' }} />
        <Typography variant="alpha" as="h1" style={{ marginBottom: '2rem' }}>
          Sync Dashboard
        </Typography>

        <Box padding={2}>
          <Button
            onClick={() => setIsUserModalOpen(true)}
            variant="default"
            style={{ marginRight: '1rem' }}
          >
            Sync Users
          </Button>
          <Button
            onClick={handleSyncRoles}
            variant="default"
            style={{ marginRight: '1rem' }}
            loading={syncingRoles || checkingRoleStatus}
            disabled={syncingRoles || rolesSynced || checkingRoleStatus}
          >
            Sync Roles
          </Button>
          <AssignRolesButton style={{ marginRight: '1rem' }} />
          <Button onClick={handleSyncContentTypes} variant="default">
            Sync Content Types
          </Button>
        </Box>
      </Flex>

      <SyncUsersModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
    </>
  );
};

export { Dashboard };
