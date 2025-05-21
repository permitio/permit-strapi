export const extractPermitAttributes = (
  attributes: Record<string, any> | undefined,
  contentTypeName: string
): Record<string, any> => {
  if (!attributes) {
    return {};
  }

  const defaultAttributes = [
    'createdAt',
    'updatedAt',
    'publishedAt',
    'createdBy',
    'updatedBy',
    'locale',
    'localizations',
  ];

  const permitAttributes = {};

  Object.entries(attributes).forEach(([key, value]) => {
    if (!defaultAttributes.includes(key)) {
      let permitType = 'string';
      const attrValue = value as any;

      switch (attrValue.type) {
        case 'boolean':
          permitType = 'bool';
          break;
        case 'integer':
        case 'biginteger':
        case 'decimal':
        case 'float':
        case 'number':
          permitType = 'number';
          break;
        case 'date':
        case 'datetime':
        case 'time':
          permitType = 'time';
          break;
        case 'json':
          permitType = 'json';
          break;
      }

      permitAttributes[key] = {
        type: permitType,
        description: `${key} attribute for ${contentTypeName}`,
      };
    }
  });

  return permitAttributes;
};
