export const textField = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};
