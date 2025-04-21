import React, { useState, useEffect } from 'react';
import { Box, Button, Modal, Flex, Field, Link } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { PasswordToggleIcon } from './PasswordToggleIcon';
import axios from 'axios';
import { useNotification } from '@strapi/strapi/admin';

interface EditConfigModalProps {
  style?: React.CSSProperties;
}

const EditConfigModal = ({ style }: EditConfigModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [config, setConfig] = useState({ token: '', pdp: '' });
  const [loading, setLoading] = useState(false);
  const { toggleNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      const fetchConfig = async () => {
        setLoading(true);
        try {
          const { data } = await axios.get('/strapi-permit-auth/config');
          if (data.success) {
            setConfig({
              token: data.config.token || '',
              pdp: data.config.pdp || '',
            });
          }
        } catch (error) {
          toggleNotification({
            type: 'warning',
            message: 'Error checking configuration',
          });
        } finally {
          setLoading(false);
        }
      };

      fetchConfig();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await axios.patch('/strapi-permit-auth/config', {
        token: config.token,
        pdp: config.pdp,
      });

      if (data.success) {
        toggleNotification({
          type: 'success',
          message: data.message || 'Configuration updated successfully',
        });
        setIsOpen(false);
      } else {
        throw new Error(data.message || 'Failed to update configuration');
      }
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Error updating configuration',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={style}>
      <Modal.Root open={isOpen} onOpenChange={setIsOpen}>
        <Modal.Trigger>
          <Button variant="tertiary" startIcon={<Pencil />}>
            Edit Config
          </Button>
        </Modal.Trigger>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Edit Configuration</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Flex direction="column" alignItems="center" gap={4} width="100%">
              <Field.Root style={{ width: '100%' }}>
                <Field.Label>Permit API Key</Field.Label>
                <Field.Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your Permit API key"
                  value={config.token}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfig((prev) => ({ ...prev, token: e.target.value }))
                  }
                  disabled={loading}
                  endAction={
                    <Field.Action
                      onClick={() => setShowPassword(!showPassword)}
                      label={showPassword ? 'Hide API key' : 'Show API key'}
                    >
                      <PasswordToggleIcon showPassword={showPassword} />
                    </Field.Action>
                  }
                />
              </Field.Root>

              <Field.Root
                style={{ width: '100%' }}
                hint={
                  <>
                    Cloud PDP supports RBAC only. Use deployed local PDP for ABAC/ReBAC.{' '}
                    <Link
                      href="https://docs.permit.io/concepts/pdp/overview/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#4945FF' }}
                    >
                      Learn more.
                    </Link>
                  </>
                }
              >
                <Field.Label>PDP URL</Field.Label>
                <Field.Input
                  type="text"
                  placeholder="Enter your PDP URL"
                  value={config.pdp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfig((prev) => ({ ...prev, pdp: e.target.value }))
                  }
                  disabled={loading}
                />
                <Field.Hint />
              </Field.Root>
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">Cancel</Button>
            </Modal.Close>
            <Button onClick={handleSave} disabled={loading} loading={loading}>
              Save
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Box>
  );
};

export { EditConfigModal };
