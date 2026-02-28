export const dim = (text: string) => `\x1b[2m${text}\x1b[22m`;
export const bold = (text: string) => `\x1b[1m${text}\x1b[22m`;
export const strikethrough = (text: string) => `\x1b[9m${text}\x1b[29m`;

export const gray = (text: string) => `\x1b[90m${text}\x1b[39m`;
export const cyan = (text: string) => `\x1b[36m${text}\x1b[39m`;
export const green = (text: string) => `\x1b[32m${text}\x1b[39m`;
export const yellow = (text: string) => `\x1b[33m${text}\x1b[39m`;

export const colorize = (text: string, ansiColor: string) =>
  `\x1b[${ansiColor}m${text}\x1b[39m`;

export const DEFAULT_ICON_COLOR = '38;5;214';
