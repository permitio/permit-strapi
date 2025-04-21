import React, { useState } from 'react';
import { Button } from '@strapi/design-system';
import { useNotification } from '@strapi/strapi/admin';
import axios from 'axios';

interface AssignRolesButtonProps {
  style?: React.CSSProperties;
}

const AssignRolesButton = ({ style }: AssignRolesButtonProps) => {
  const { toggleNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const handleAssignRoles = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.post('/strapi-permit-auth/assign-roles');

      if (data.success) {
        toggleNotification({
          type: 'success',
          message: data.message || 'Roles assigned successfully',
        });
      } else {
        throw new Error(data.message || 'Failed to assign roles');
      }
    } catch (error: any) {
      toggleNotification({
        type: 'warning',
        message: 'Error assigning roles: ' + (error.message || 'Unknown error'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAssignRoles}
      variant="default"
      style={style}
      loading={isLoading}
      disabled={isLoading}
    >
      Assign User Roles
    </Button>
  );
};

export { AssignRolesButton };
