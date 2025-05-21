import { Typography, Flex, Button, Link, Field } from '@strapi/design-system';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@strapi/strapi/admin';
import axios from 'axios';
import { PasswordToggleIcon } from '../components/PasswordToggleIcon';

const ConfigPage = () => {
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const [config, setConfig] = useState({ token: '', pdp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/permit-strapi/config');
        if (response.data.success && response.data.config.pdp && response.data.config.hasToken) {
          navigate('/plugins/permit-strapi/dashboard');
          return;
        }
      } catch (err: any) {
        toggleNotification({
          type: 'warning',
          message: `Error fetching configuration: ${err.message || 'Unknown error'}`,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [toggleNotification, navigate]);

  const handleBack = () => {
    navigate('/plugins/permit-strapi');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post('/permit-strapi/config', {
        token: config.token,
        pdp: config.pdp,
      });

      if (response.data.success) {
        toggleNotification({
          type: 'success',
          message: 'Configuration saved successfully',
        });
        navigate('/plugins/permit-strapi/dashboard');
      } else {
        setError(response.data.message);
        toggleNotification({
          type: 'danger',
          message: 'Failed to save configuration',
        });
      }
    } catch (err: any) {
      console.error('Error saving configuration:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save configuration';
      setError(errorMessage);
      toggleNotification({
        type: 'danger',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      direction="column"
      gap={4}
      justifyContent="center"
      alignItems="center"
      style={{ height: '100vh' }}
    >
      <Typography variant="alpha" as="h1" style={{ marginBottom: '2rem' }}>
        Permit Configuration
      </Typography>

      <Flex direction="column" alignItems="center" gap={4} width="400px">
        <Field.Root style={{ width: '100%' }}>
          <Field.Label>Permit API Key</Field.Label>
          <Field.Input
            type={showPassword ? 'text' : 'password'}
            placeholder="permit_key_..."
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
              Note: The Cloud PDP only supports RBAC policies and has a 1MB data limit. For ABAC or
              ReBAC policies, or to avoid data size restrictions, use a self-hosted (local) PDP{' '}
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
            placeholder="http://localhost:7766"
            value={config.pdp}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setConfig((prev) => ({ ...prev, pdp: e.target.value }))
            }
            disabled={loading}
          />
          <Field.Hint />
        </Field.Root>
      </Flex>

      <Flex padding={2} gap={4} style={{ marginTop: '2rem' }}>
        <Button onClick={handleBack} variant="secondary">
          Back to Homepage
        </Button>
        <Button
          onClick={handleSave}
          variant="default"
          loading={loading}
          disabled={!config.token || !config.pdp || loading}
        >
          Save Configuration
        </Button>
      </Flex>
    </Flex>
  );
};

export { ConfigPage };
