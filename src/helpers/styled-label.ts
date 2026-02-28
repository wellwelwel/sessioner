import type { StyledLabelOptions } from '../types.js';
import { colorize, DEFAULT_ICON_COLOR } from './ansi.js';

export const styledLabel = ({
  label,
  icon,
  iconColor = DEFAULT_ICON_COLOR,
}: StyledLabelOptions): string =>
  `${colorize(icon, iconColor)}\x1b[1m ${label}`;
