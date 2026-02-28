import type { ModelName, SessionStats, TokenUsage } from '../types.js';
import { bold, dim, green, yellow } from './ansi.js';

const COST_DECIMALS = 4;
const NUMBER_DECIMALS = 1;
const LABEL_COLUMN_WIDTH = 12;
const COLUMN_GAP = 2;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
const ONE_MILLION = 1_000_000;
const ONE_THOUSAND = 1_000;

const formatNumber = (value: number): string => {
  if (value >= ONE_MILLION)
    return `${(value / ONE_MILLION).toFixed(NUMBER_DECIMALS)}M`;
  if (value >= ONE_THOUSAND)
    return `${(value / ONE_THOUSAND).toFixed(NUMBER_DECIMALS)}K`;
  return String(value);
};

const formatCost = (value: number): string =>
  `$${value.toFixed(COST_DECIMALS)}`;

const formatDuration = (duration: SessionStats['duration']): string[] => {
  if (!duration.first || !duration.last) return [];

  const start = new Date(duration.first);
  const end = new Date(duration.last);
  const elapsed = end.getTime() - start.getTime();
  const hours = Math.floor(elapsed / MS_PER_HOUR);
  const minutes = Math.floor((elapsed % MS_PER_HOUR) / MS_PER_MINUTE);
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return [`  ${dim('Duration:')}    ${label}`];
};

const formatMessages = (
  messages: SessionStats['messages'],
  subagents: number
): string[] => {
  const total = messages.user + messages.assistant;
  const lines = [
    `  ${dim('Messages:')}    ${total} ${dim(`(${messages.user} user, ${messages.assistant} assistant)`)}`,
  ];

  if (subagents > 0) lines.push(`  ${dim('Subagents:')}   ${subagents}`);

  return lines;
};

const formatTokens = (tokens: TokenUsage): string[] => [
  '',
  `  ${bold('Tokens')}`,
  `  ${dim('Input:')}       ${formatNumber(tokens.input)}`,
  `  ${dim('Output:')}      ${formatNumber(tokens.output)}`,
  `  ${dim('Cache write:')} ${formatNumber(tokens.cacheCreation)}`,
  `  ${dim('Cache read:')}  ${formatNumber(tokens.cacheRead)}`,
];

const formatCostSection = (
  cost: Map<ModelName, number>,
  totalCost: number
): string[] => {
  if (cost.size === 0) return [];

  const sorted = [...cost.entries()]
    .filter(([, modelCost]) => modelCost > 0)
    .sort(([, costA], [, costB]) => costB - costA);

  const modelLines = sorted.map(([model, modelCost]) => {
    const padding = ' '.repeat(LABEL_COLUMN_WIDTH - model.length);
    return `  ${dim(`${model}:`)}${padding}${formatCost(modelCost)}`;
  });

  return [
    '',
    `  ${bold('Cost')}`,
    ...modelLines,
    `  ${dim('Total:')}       ${green(formatCost(totalCost))}`,
  ];
};

const formatToolsSection = (tools: Map<string, number>): string[] => {
  if (tools.size === 0) return [];

  const sorted = [...tools.entries()].sort(
    ([, countA], [, countB]) => countB - countA
  );
  const longest = Math.max(...sorted.map(([name]) => name.length));

  const toolLines = sorted.map(([name, count]) => {
    const padding = ' '.repeat(longest - name.length + COLUMN_GAP);
    return `  ${dim(name)}${padding}${yellow(String(count))}`;
  });

  return ['', `  ${bold('Tools')}`, ...toolLines];
};

export const formatStats = (result: SessionStats): string[] => [
  ...formatDuration(result.duration),
  ...formatMessages(result.messages, result.subagents),
  ...formatTokens(result.tokens),
  ...formatCostSection(result.cost, result.totalCost),
  ...formatToolsSection(result.tools),
];

export const formatProjectStats = (
  result: SessionStats,
  count: number
): string[] => [`  ${dim('Sessions:')}    ${count}`, ...formatStats(result)];
