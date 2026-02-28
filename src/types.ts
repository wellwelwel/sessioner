export type MessageContent = {
  type: string;
  text?: string;
};

export type Message = {
  type: string;
  message?: {
    content: MessageContent[];
  };
};

export type Session = {
  id: string;
  date: string;
  message: string;
  file: string;
};

export type Action =
  | 'open'
  | 'fork'
  | 'merge'
  | 'prune'
  | 'trim'
  | 'rename'
  | 'delete'
  | 'stats'
  | 'back'
  | 'exit';

export type StyledLabelOptions = {
  label: string;
  icon: string;
  iconColor?: string;
};

export type SelectOption<T> = {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
  separator?: boolean;
  icon?: string;
  iconColor?: string;
  number?: number;
};

export type SelectConfig<T> = {
  message: string;
  options: SelectOption<T>[];
  initialValue?: T;
  numbered?: boolean;
  shortcuts?: Map<string, number>;
};

export type ListResult = {
  sessions: Session[];
  empty: string[];
};

export type IndexEntry = {
  sessionId: string;
  firstPrompt: string;
  [key: string]: unknown;
};

export type SessionIndex = {
  version: number;
  entries: IndexEntry[];
  [key: string]: unknown;
};

export type ContentBlock = {
  type: string;
  text?: string;
  [key: string]: unknown;
};

export type ModelName = 'opus' | 'sonnet' | 'haiku' | 'unknown';

export type TokenUsage = {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
};

export type SessionStats = {
  tokens: TokenUsage;
  cost: Map<ModelName, number>;
  totalCost: number;
  tools: Map<string, number>;
  duration: { first: string; last: string };
  messages: { user: number; assistant: number };
  subagents: number;
};

export type PruneStats = {
  toolBlocks: number;
  shortMessages: number;
  emptyMessages: number;
  systemTags: number;
  customTitles: number;
};

export type PruneOptions = {
  toolBlocks: boolean;
  shortMessages: boolean;
  emptyMessages: boolean;
  systemTags: boolean;
  customTitles: boolean;
};

export type SearchMatch = {
  session: Session;
  entries: string[];
};

export type ActionResult = 'back' | 'exit';
