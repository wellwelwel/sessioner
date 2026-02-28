import type { ModelName, Session, SessionStats, TokenUsage } from '../types.js';
import { readFile } from 'node:fs/promises';
import { countSubagents } from './count-subagents.js';

const TOKENS_PER_MILLION = 1_000_000;

const PRICING: Record<
  ModelName,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  opus: { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  sonnet: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  haiku: { input: 0.8, output: 4, cacheWrite: 1.0, cacheRead: 0.08 },
  unknown: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
};

const detectModel = (modelString: string): ModelName => {
  if (modelString.includes('opus')) return 'opus';
  if (modelString.includes('haiku')) return 'haiku';
  if (modelString.includes('sonnet')) return 'sonnet';
  return 'unknown';
};

const computeCost = (tokens: TokenUsage, model: ModelName): number => {
  const pricing = PRICING[model];
  return (
    (tokens.input * pricing.input +
      tokens.output * pricing.output +
      tokens.cacheCreation * pricing.cacheWrite +
      tokens.cacheRead * pricing.cacheRead) /
    TOKENS_PER_MILLION
  );
};

export const stats = async (session: Session): Promise<SessionStats> => {
  const raw = await readFile(session.file, 'utf-8');
  const lines = raw.split('\n');

  const tokens: TokenUsage = {
    input: 0,
    output: 0,
    cacheCreation: 0,
    cacheRead: 0,
  };
  const perModel = new Map<ModelName, TokenUsage>();
  const tools = new Map<string, number>();
  let userCount = 0;
  let assistantCount = 0;
  let first = '';
  let last = '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);

      if (parsed.timestamp) {
        if (!first) first = parsed.timestamp;
        last = parsed.timestamp;
      }

      if (parsed.type === 'user') userCount++;
      if (parsed.type === 'assistant') assistantCount++;

      if (parsed.type === 'assistant' && parsed.message?.usage) {
        const usage = parsed.message.usage;
        const model = detectModel(parsed.message.model ?? '');

        const input = usage.input_tokens ?? 0;
        const output = usage.output_tokens ?? 0;
        const cacheCreation = usage.cache_creation_input_tokens ?? 0;
        const cacheRead = usage.cache_read_input_tokens ?? 0;

        tokens.input += input;
        tokens.output += output;
        tokens.cacheCreation += cacheCreation;
        tokens.cacheRead += cacheRead;

        const existing = perModel.get(model) ?? {
          input: 0,
          output: 0,
          cacheCreation: 0,
          cacheRead: 0,
        };
        existing.input += input;
        existing.output += output;
        existing.cacheCreation += cacheCreation;
        existing.cacheRead += cacheRead;
        perModel.set(model, existing);
      }

      if (
        parsed.type === 'assistant' &&
        Array.isArray(parsed.message?.content)
      ) {
        for (const block of parsed.message.content) {
          if (block.type !== 'tool_use') continue;
          const name = block.name ?? 'unknown';
          tools.set(name, (tools.get(name) ?? 0) + 1);
        }
      }
    } catch {}
  }

  const cost = new Map<ModelName, number>();
  let totalCost = 0;

  for (const [model, modelTokens] of perModel) {
    const modelCost = computeCost(modelTokens, model);
    cost.set(model, modelCost);
    totalCost += modelCost;
  }

  const subagents = await countSubagents(session);

  return {
    tokens,
    cost,
    totalCost,
    tools,
    duration: { first, last },
    messages: { user: userCount, assistant: assistantCount },
    subagents,
  };
};

export const projectStats = async (
  sessions: Session[]
): Promise<SessionStats> => {
  const totals: SessionStats = {
    tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
    cost: new Map(),
    totalCost: 0,
    tools: new Map(),
    duration: { first: '', last: '' },
    messages: { user: 0, assistant: 0 },
    subagents: 0,
  };

  for (const session of sessions) {
    const result = await stats(session);

    totals.tokens.input += result.tokens.input;
    totals.tokens.output += result.tokens.output;
    totals.tokens.cacheCreation += result.tokens.cacheCreation;
    totals.tokens.cacheRead += result.tokens.cacheRead;

    totals.messages.user += result.messages.user;
    totals.messages.assistant += result.messages.assistant;
    totals.subagents += result.subagents;
    totals.totalCost += result.totalCost;

    for (const [model, modelCost] of result.cost) {
      totals.cost.set(model, (totals.cost.get(model) ?? 0) + modelCost);
    }

    for (const [tool, count] of result.tools) {
      totals.tools.set(tool, (totals.tools.get(tool) ?? 0) + count);
    }

    if (result.duration.first) {
      if (
        !totals.duration.first ||
        result.duration.first < totals.duration.first
      )
        totals.duration.first = result.duration.first;
    }

    if (result.duration.last) {
      if (!totals.duration.last || result.duration.last > totals.duration.last)
        totals.duration.last = result.duration.last;
    }
  }

  return totals;
};
