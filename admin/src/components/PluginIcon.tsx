import logo from '../assets/logo.png';
import './PluginIcon.css';

const PluginIcon = () => (
  <img src={logo} width={24} height={24} alt="Strapi Plugin Logo" className="pluginIcon" />
);

export { PluginIcon };
