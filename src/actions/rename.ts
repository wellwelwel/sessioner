import type { Session } from '../types.js';
import { appendFile } from 'node:fs/promises';

export const rename = async (
  session: Session,
  title: string
): Promise<void> => {
  const entry = JSON.stringify({
    type: 'custom-title',
    sessionId: session.id,
    customTitle: title,
  });

  await appendFile(session.file, `\n${entry}`);
};
