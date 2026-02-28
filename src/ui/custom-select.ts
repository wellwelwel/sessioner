import type { SelectConfig, SelectOption } from '../types.js';
import { SelectPrompt } from '@clack/core';
import {
  limitOptions,
  S_BAR,
  S_BAR_END,
  S_RADIO_ACTIVE,
  S_RADIO_INACTIVE,
  symbol,
} from '@clack/prompts';
import {
  colorize,
  cyan,
  DEFAULT_ICON_COLOR,
  dim,
  gray,
  green,
  strikethrough,
} from '../helpers/ansi.js';

const style = <T>(option: SelectOption<T>, active: boolean): string => {
  if (option.separator) return '';

  const label = option.label;

  if (option.disabled) {
    const bullet = option.icon ?? S_RADIO_INACTIVE;
    const hint = option.hint ? ` ${dim(`(${option.hint})`)}` : '';
    return `${gray(bullet)} ${gray(label)}${hint}`;
  }

  const numStr = option.number !== undefined ? `[${option.number}] ` : '';

  if (active) {
    const bullet = option.icon ?? S_RADIO_ACTIVE;
    const hint = option.hint ? ` ${dim(`(${option.hint})`)}` : '';
    const styledBullet = option.icon
      ? colorize(bullet, option.iconColor ?? DEFAULT_ICON_COLOR)
      : green(bullet);
    const numLabel =
      option.number !== undefined ? `${dim(`[${option.number}]`)} ` : '';
    return `${styledBullet} ${numLabel}${label}${hint}`;
  }

  const bullet = option.icon ?? S_RADIO_INACTIVE;
  const color = option.icon ? (option.iconColor ?? DEFAULT_ICON_COLOR) : null;
  const styledBullet = color ? colorize(bullet, color) : dim(bullet);
  return `${styledBullet} ${dim(`${numStr}${label}`)}`;
};

export const select = <T>(
  config: SelectConfig<T>
): Promise<T | symbol | undefined> => {
  const numberMap = new Map<number, number>();

  if (config.numbered) {
    let num = 1;

    for (let index = 0; index < config.options.length; index++) {
      const option = config.options[index];
      if (!option || option.separator || option.disabled) continue;

      if (option.label === 'Exit') {
        option.number = 0;
        numberMap.set(0, index);
      } else {
        option.number = num;
        numberMap.set(num, index);
        num++;
      }
    }
  }

  const prompt = new SelectPrompt<SelectOption<T>>({
    options: config.options,
    initialValue: config.initialValue,
    render() {
      const header = `${gray(S_BAR)}\n${symbol(this.state)}  ${config.message}\n`;

      switch (this.state) {
        case 'submit': {
          const selected = this.options[this.cursor];
          if (!selected) return header;
          return `${header}${gray(S_BAR)}  ${dim(selected.label)}`;
        }
        case 'cancel': {
          const selected = this.options[this.cursor];
          if (!selected) return header;
          return `${header}${gray(S_BAR)}  ${strikethrough(dim(selected.label))}\n${gray(S_BAR)}`;
        }
        default: {
          const prefix = `${cyan(S_BAR)}  `;
          const end = cyan(S_BAR_END);
          const headerLines = header.split('\n').length;

          const lines = limitOptions({
            cursor: this.cursor,
            options: this.options,
            maxItems: undefined,
            style,
            columnPadding: prefix.length,
            rowPadding: headerLines + 2,
          });

          return `${header}${prefix}${lines.join(`\n${prefix}`)}\n${end}\n`;
        }
      }
    },
  });

  const hasNumbered = config.numbered && numberMap.size > 0;
  const shortcuts = config.shortcuts;
  const hasShortcuts = shortcuts && shortcuts.size > 0;

  if (hasNumbered || hasShortcuts) {
    let submitting = false;

    prompt.on('key', (char) => {
      if (submitting || char === undefined) return;

      let targetIndex: number | undefined;

      if (hasNumbered) {
        const digit = parseInt(char);
        if (!isNaN(digit)) targetIndex = numberMap.get(digit);
      }

      if (targetIndex === undefined && hasShortcuts) {
        targetIndex = shortcuts.get(char);
      }

      if (targetIndex === undefined) return;

      const selected = config.options[targetIndex];
      if (!selected) return;

      submitting = true;
      prompt.cursor = targetIndex;
      prompt.value = selected.value;
      setImmediate(() => {
        process.stdin.emit('keypress', '\r', { name: 'return' });
      });
    });
  }

  return prompt.prompt();
};
