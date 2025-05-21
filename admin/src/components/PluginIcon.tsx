import logo from '../assets/logo.png';
import './PluginIcon.css';

const PluginIcon = () => (
  <img
    src={logo}
    style={{ width: 24, height: 24, borderRadius: 4 }}
    alt="Strapi Plugin Logo"
    className="pluginIcon"
  />
);

export { PluginIcon };
