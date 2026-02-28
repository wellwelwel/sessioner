import type { Message } from '../types.js';

export const parseLine = (line: string): Message | null => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};
