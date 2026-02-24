import { useState, useEffect } from 'react';
import { Page } from '@strapi/strapi/admin';
import { useFetchClient } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

import { HomePage } from './HomePage';
import { GettingStarted } from './GettingStarted';

const App = () => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const { get } = useFetchClient();

  useEffect(() => {
    get('/permit-strapi/config')
      .then(({ data }) => setIsConfigured(data.configured))
      .catch(() => setIsConfigured(false));
  }, []);

  if (isConfigured === null) {
    return <Page.Loading />;
  }

  if (!isConfigured) {
    return <GettingStarted onConnect={() => setIsConfigured(true)} />;
  }

  return (
    <Routes>
      <Route index element={<HomePage onDisconnect={() => setIsConfigured(false)} />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
