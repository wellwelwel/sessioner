import type { Session } from '../types.js';
import { exec } from 'node:child_process';

const commands: Record<string, (file: string) => string> = {
  darwin: (file) => `open -R "${file}"`,
  win32: (file) => `explorer /select,"${file}"`,
};

const fallback = (file: string) => `xdg-open "${file}"`;

export const open = (session: Session): void => {
  const build = commands[process.platform] ?? fallback;
  exec(build(session.file));
};
