/// <reference path="../../custom.d.ts" />
import logo from '../assets/logo.png';
import styled from 'styled-components';

const Icon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 2px;
`;
const PluginIcon = () => <Icon src={logo} alt="Permit.io" />;

export { PluginIcon };
