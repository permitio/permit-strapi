import { useState } from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Check, ExternalLink, Information } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import styled from 'styled-components';
/// <reference path="../../custom.d.ts" />
import logo from '../assets/logo.png';

const Logo = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
`;

const StepLink = styled.a`
  color: ${({ theme }) => theme.colors.primary600};
  font-size: ${({ theme }) => theme.fontSizes[2]};
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const StepNumber = styled(Flex)`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary100};
  flex-shrink: 0;
`;

const steps = [
  {
    number: 1,
    title: 'Create a Permit.io account',
    description: 'Sign up at permit.io and create a new workspace for your project.',
    link: 'https://app.permit.io',
    linkText: 'Go to Permit.io',
  },
  {
    number: 2,
    title: 'Set up your resources and policies',
    description:
      'In the Permit.io dashboard, define your resources (e.g. Article, Product) and assign roles and policies.',
    link: 'https://docs.permit.io',
    linkText: 'Read the docs',
  },
  {
    number: 3,
    title: 'Enter your API key below',
    description: 'Copy your API key from the Permit.io dashboard and paste it below to connect.',
  },
];

const DEFAULT_PDP_URL = 'https://cloudpdp.api.permit.io';

interface GettingStartedProps {
  onConnect: () => void;
}

const GettingStarted = ({ onConnect }: GettingStartedProps) => {
  const [apiKey, setApiKey] = useState('');
  const [pdpUrl, setPdpUrl] = useState(DEFAULT_PDP_URL);
  const [errors, setErrors] = useState<{ apiKey?: string }>({});
  const [loading, setLoading] = useState(false);

  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setErrors({ apiKey: 'API key is required' });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await post('/permit-strapi/config', {
        apiKey: apiKey.trim(),
        pdpUrl: pdpUrl.trim() || DEFAULT_PDP_URL,
      });

      toggleNotification({
        type: 'success',
        message: 'Successfully connected to Permit.io',
      });

      onConnect();
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message || 'Failed to connect. Please check your API key.';

      toggleNotification({
        type: 'danger',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box padding={10}>
      {/* Header */}
      <Flex direction="column" alignItems="center" gap={4} paddingBottom={10}>
        <Logo src={logo} alt="Permit.io" />
        <Flex direction="column" alignItems="center" gap={2}>
          <Typography variant="alpha">Welcome to Permit Strapi</Typography>
          <Typography variant="epsilon" textColor="neutral600">
            Fine-grained authorization for your Strapi content types, powered by Permit.io
          </Typography>
        </Flex>
      </Flex>

      {/* Steps */}
      <Box
        background="neutral0"
        shadow="tableShadow"
        hasRadius
        padding={8}
        marginBottom={6}
        style={{ maxWidth: 640, margin: '0 auto 24px auto' }}
      >
        <Typography variant="delta" paddingBottom={6}>
          Get started in 3 steps
        </Typography>

        <Flex direction="column" gap={6} paddingTop={4}>
          {steps.map((step) => (
            <Flex key={step.number} gap={4} alignItems="flex-start">
              <StepNumber justifyContent="center" alignItems="center">
                <Typography variant="sigma" textColor="primary600">
                  {step.number}
                </Typography>
              </StepNumber>
              <Flex direction="column" gap={1}>
                <Typography variant="omega" fontWeight="bold">
                  {step.title}
                </Typography>
                <Typography variant="omega" textColor="neutral600">
                  {step.description}
                </Typography>
                {step.link && (
                  <Flex gap={1} alignItems="center" paddingTop={1}>
                    <StepLink href={step.link} target="_blank" rel="noreferrer">
                      {step.linkText}
                    </StepLink>
                    <ExternalLink width="12px" height="12px" fill="primary600" />
                  </Flex>
                )}
              </Flex>
            </Flex>
          ))}
        </Flex>

        {/* API Key Input */}
        <Box paddingTop={8}>
          <Field.Root name="apiKey" error={errors.apiKey}>
            <Field.Label>Permit.io API Key</Field.Label>
            <TextInput
              placeholder="permit_key_..."
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              type="password"
            />
            <Field.Error />
          </Field.Root>
        </Box>

        {/* PDP URL Input */}
        <Box paddingTop={4}>
          <Field.Root name="pdpUrl" hint="Leave as default to use Permit.io Cloud PDP. Change to your local PDP URL if self-hosting.">
            <Field.Label>PDP URL</Field.Label>
            <Field.Hint />
            <TextInput
              placeholder={DEFAULT_PDP_URL}
              value={pdpUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdpUrl(e.target.value)}
            />
          </Field.Root>
          <Box paddingTop={3}>
            <Flex
              gap={2}
              alignItems="flex-start"
              padding={3}
              style={{ background: '#f0f4ff', borderRadius: '4px' }}
            >
              <Information width="14px" height="14px" fill="primary600" style={{ flexShrink: 0, marginTop: '2px' }} />
              <Typography variant="pi" textColor="primary600">
                The Cloud PDP supports <strong>RBAC only</strong>. If you plan to use ABAC or ReBAC policies, you must deploy a{' '}
                <a
                  href="https://docs.permit.io/how-to/deploy/deploy-to-production"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  self-hosted PDP
                </a>
                .
              </Typography>
            </Flex>
          </Box>
        </Box>

        {/* Connect Button */}
        <Flex paddingTop={6} justifyContent="flex-end">
          <Button
            startIcon={<Check />}
            onClick={handleConnect}
            disabled={!apiKey.trim() || loading}
            loading={loading}
            size="L"
          >
            Connect to Permit.io
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export { GettingStarted };
