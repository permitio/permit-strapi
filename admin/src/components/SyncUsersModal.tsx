// SyncUsersModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Button,
  Typography,
  Modal,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Flex,
} from '@strapi/design-system';
import { useNotification } from '@strapi/strapi/admin';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  firstname?: string;
  lastname?: string;
  roles: { id: number; code: string; name: string }[];
  createdAt: string;
}

interface SyncUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SyncUsersModal = ({ isOpen, onClose }: SyncUsersModalProps) => {
  const { toggleNotification } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncedUsers, setSyncedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      // Fetch both users and synced users in parallel
      const fetchData = async () => {
        setLoading(true);
        try {
          const [usersResponse, syncedUsersResponse] = await Promise.all([
            axios.get('/strapi-permit-auth/users'),
            axios.get('/strapi-permit-auth/synced-users'),
          ]);

          if (usersResponse.data.success) {
            setUsers(usersResponse.data.data || []);
          }

          // Process synced users
          if (syncedUsersResponse.data.success) {
            const syncedUsersData = syncedUsersResponse.data.data || [];
            const syncedEmails: Record<string, boolean> = {};

            // Create a map of synced emails
            syncedUsersData.forEach((syncedUser: { email: string }) => {
              syncedEmails[syncedUser.email] = true;
            });

            setSyncedUsers(syncedEmails);

            // Pre-select synced users
            const initialSelectedUsers: Record<number, boolean> = {};
            usersResponse.data.data?.forEach((user: User) => {
              if (syncedEmails[user.email]) {
                initialSelectedUsers[user.id] = true;
              }
            });

            setSelectedUsers(initialSelectedUsers);
          }
        } catch (error: any) {
          toggleNotification({
            type: 'warning',
            message: 'Error fetching data: ' + (error.message || 'Unknown error'),
          });
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [isOpen, toggleNotification]);

  const toggleUserSelection = (userId: number, userEmail: string) => {
    // Don't allow toggling synced users
    if (!syncedUsers[userEmail]) {
      setSelectedUsers((prev) => ({
        ...prev,
        [userId]: !prev[userId],
      }));
    }
  };

  const toggleSelectAll = () => {
    // Check if all non-synced users are selected
    const allNonSyncedSelected = users.every(
      (user) => syncedUsers[user.email] || selectedUsers[user.id]
    );

    if (allNonSyncedSelected) {
      // Unselect all non-synced users
      const newSelectedUsers = { ...selectedUsers };
      users.forEach((user) => {
        if (!syncedUsers[user.email]) {
          newSelectedUsers[user.id] = false;
        }
      });
      setSelectedUsers(newSelectedUsers);
    } else {
      // Select all non-synced users
      const newSelectedUsers = { ...selectedUsers };
      users.forEach((user) => {
        // Keep synced users selected, select all others
        if (syncedUsers[user.email]) {
          newSelectedUsers[user.id] = true;
        } else {
          newSelectedUsers[user.id] = true;
        }
      });
      setSelectedUsers(newSelectedUsers);
    }
  };

  const handleConfirm = async () => {
    const usersToSync = users.filter((user) => selectedUsers[user.id] && !syncedUsers[user.email]);

    if (usersToSync.length === 0) {
      toggleNotification({
        type: 'info',
        message: 'No new users selected to sync',
      });
      return;
    }

    setSyncLoading(true);
    try {
      // Format user data for the API
      const formattedUsers = usersToSync.map((user) => ({
        key: user.email,
        email: user.email,
        first_name: user.firstname || '',
        last_name: user.lastname || '',
        attributes: {},
      }));

      // Call the sync API
      const { data } = await axios.post('/strapi-permit-auth/sync-users', {
        users: formattedUsers,
      });

      if (data.success) {
        toggleNotification({
          type: 'success',
          message: `Successfully synced ${usersToSync.length} user(s)`,
        });
        onClose();
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (error: any) {
      toggleNotification({
        type: 'warning',
        message: 'Error syncing users: ' + (error.message || 'Unknown error'),
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const modalBody = (
    <>
      {loading ? (
        <Typography>Loading users...</Typography>
      ) : users.length === 0 ? (
        <Typography>No users found.</Typography>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>
                <Flex alignItems="center" gap={2}>
                  <Checkbox
                    checked={
                      users.length > 0 &&
                      users.every((user) => syncedUsers[user.email] || selectedUsers[user.id])
                    }
                    indeterminate={
                      !users.every((user) => syncedUsers[user.email] || selectedUsers[user.id]) &&
                      users.some((user) => !syncedUsers[user.email] && selectedUsers[user.id])
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <Typography>Select</Typography>
                </Flex>
              </Th>
              <Th>S/N</Th>
              <Th>Email</Th>
              <Th>Role(s)</Th>
              <Th>Created At</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td>
                  <Checkbox
                    checked={!!selectedUsers[user.id]}
                    onCheckedChange={() => toggleUserSelection(user.id, user.email)}
                    disabled={syncedUsers[user.email]}
                  />
                </Td>
                <Td>{user.id}</Td>
                <Td>{user.email}</Td>
                <Td>{user.roles?.map((role) => role.name).join(', ') || 'N/A'}</Td>
                <Td>{new Date(user.createdAt).toLocaleDateString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Sync Users</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalBody}</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">Cancel</Button>
          </Modal.Close>
          <Button
            onClick={handleConfirm}
            loading={syncLoading}
            disabled={syncLoading || Object.values(selectedUsers).filter(Boolean).length === 0}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { SyncUsersModal };
