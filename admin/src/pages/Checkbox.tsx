import { Typography, Checkbox } from '@strapi/design-system';
import { useState } from 'react';

interface CheckboxChangeEvent {
  checked: boolean;
}

const CheckboxComponent = () => {
  const [isChecked, setIsChecked] = useState(false);

  const handleChange = (checked: CheckboxChangeEvent['checked']) => {
    setIsChecked(checked);
    console.log('Checkbox is now:', checked); // Optional: to see the value change
  };

  console.log('isChecked', isChecked);
  return (
    <Checkbox checked={isChecked} onCheckedChange={handleChange}>
      Checkbox
    </Checkbox>
  );
};

export { CheckboxComponent };
