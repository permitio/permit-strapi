import { Eye, EyeStriked } from '@strapi/icons';

interface PasswordToggleProps {
  showPassword: boolean;
}

const PasswordToggleIcon = ({ showPassword }: PasswordToggleProps) => {
  return showPassword ? <EyeStriked fill="primary700" /> : <Eye fill="primary700" />;
};

export { PasswordToggleIcon };
