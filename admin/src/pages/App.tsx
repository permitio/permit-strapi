import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './HomePage';
import { ConfigPage } from './ConfigPage';
import { Dashboard } from './Dashboard';

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="config" element={<ConfigPage />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
