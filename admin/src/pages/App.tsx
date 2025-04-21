import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

import { HomePage } from './HomePage';
import { ConfigPage } from './ConfigPage';
import { Dashboard } from './Dashboard';
import { CheckboxComponent } from './Checkbox';

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="config" element={<ConfigPage />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="checkbox" element={<CheckboxComponent />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
