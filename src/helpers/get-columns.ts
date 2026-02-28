const DEFAULT_COLUMNS = 80;

export const getColumns = (): number => {
  if (process.stdout.isTTY && process.stdout.columns)
    return process.stdout.columns;

  if (process.stderr.isTTY && process.stderr.columns)
    return process.stderr.columns;

  return DEFAULT_COLUMNS;
};
