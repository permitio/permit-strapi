import { Typography, Flex, Button, Loader, Link } from '@strapi/design-system';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@strapi/strapi/admin';
import axios from 'axios';
import { PermitIcon } from '../components/PermitIcon';

const HomePage = () => {
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get('/strapi-permit-auth/config');
        if (data.success && data.config.pdp && data.config.token) {
          navigate('/plugins/strapi-permit-auth/dashboard');
        }
      } catch (error) {
        strapi.log.error('Failed to fetch config in HomePage', error);
        toggleNotification({
          type: 'warning',
          message: 'Error checking configuration',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [navigate, toggleNotification]);

  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center" style={{ height: '100vh' }}>
        <Loader />
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      style={{ height: '100vh' }}
    >
      <Flex gap={4} style={{ marginBottom: '1rem' }}>
        <PermitIcon />
      </Flex>
      <Typography variant="alpha" as="h1" style={{ marginTop: '2rem' }}>
        Welcome to Strapi-Permit Plugin
      </Typography>

      <Typography variant="delta" style={{ marginTop: '2rem' }}>
        A strapi integration for fine-grained authorization using Permit
      </Typography>

      <Flex padding={2} gap={4} style={{ marginTop: '2rem' }}>
        <Button onClick={() => navigate('/plugins/strapi-permit-auth/config')} variant="secondary">
          Get Started
        </Button>
        <Link
          href="https://github.com/permitio/permit-strapi"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button>Documentation</Button>
        </Link>
      </Flex>
    </Flex>
  );
};

export { HomePage };
