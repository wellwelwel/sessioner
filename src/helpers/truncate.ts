export const truncate = (text: string, maxLength: number): string =>
  text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
