export interface ParsedArguments {
  readonly _: readonly string[];
  readonly name?: string;
  readonly template?: string;
  readonly path?: string;
  readonly [key: string]: unknown;
}

export function parseCliArgs(args: readonly string[]): ParsedArguments {
  const positionals: string[] = [];
  const options: Record<string, unknown> = {};

  for (let i = 0; i < args.length; i += 1) {
    const segment = args[i];
    if (!segment.startsWith("-")) {
      positionals.push(segment);
      continue;
    }

    const { key, value, consumed } = parseOption(segment, args[i + 1]);
    options[key] = value;
    if (consumed) {
      i += 1;
    }
  }

  if (options.n && options.name === undefined) {
    options.name = options.n;
  }
  if (options.t && options.template === undefined) {
    options.template = options.t;
  }
  if (options.p && options.path === undefined) {
    options.path = options.p;
  }

  delete options.n;
  delete options.t;
  delete options.p;

  if (options.template === undefined) {
    options.template = "basic";
  }

  return {
    _: positionals,
    ...options,
  };
}

function parseOption(current: string, next?: string) {
  if (current.startsWith("--")) {
    const [longKey, inlineValue] = current.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      return { key: longKey, value: inlineValue, consumed: false };
    }
    if (next !== undefined && !next.startsWith("-")) {
      return { key: longKey, value: next, consumed: true };
    }
    return { key: longKey, value: true, consumed: false };
  }

  const shortKey = current.slice(1);
  if (next !== undefined && !next.startsWith("-")) {
    return { key: shortKey, value: next, consumed: true };
  }
  return { key: shortKey, value: true, consumed: false };
}
