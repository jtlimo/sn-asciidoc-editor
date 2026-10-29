export interface IncludeOptions {
  maxDepth?: number;
  maxBytes?: number;
  timeoutMs?: number;
}

export interface IncludeResult {
  text: string;
  errors: string[];
}

const INCLUDE_RE = /^(\s*)include::([^\s\[]+)\[([^\]]*)\]\s*$/;
const REMOTE_RE = /^https?:\/\//i;

export async function expandRemoteIncludes(
  source: string,
  options: IncludeOptions = {},
): Promise<IncludeResult> {
  const maxDepth = options.maxDepth ?? 3;
  const maxBytes = options.maxBytes ?? 1_000_000;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const errors: string[] = [];
  const active = new Set<string>();

  async function expand(text: string, depth: number, baseUrl?: string): Promise<string> {
    const lines = text.split('\n');
    const output: string[] = [];

    for (const line of lines) {
      const match = INCLUDE_RE.exec(line);

      if (!match) {
        output.push(line);
        continue;
      }

      const target = resolveTarget(match[2], baseUrl);

      if (!target || !REMOTE_RE.test(target)) {
        output.push(line);
        continue;
      }

      if (depth >= maxDepth) {
        errors.push(`Include depth limit reached for ${target}`);
        output.push(`// include skipped (depth limit): ${target}`);
        continue;
      }

      if (active.has(target)) {
        errors.push(`Include cycle detected at ${target}`);
        output.push(`// include skipped (cycle): ${target}`);
        continue;
      }

      active.add(target);

      try {
        const body = await fetchText(target, timeoutMs);

        if (body.length > maxBytes) {
          errors.push(`Include exceeds ${maxBytes} bytes: ${target}`);
          output.push(`// include skipped (too large): ${target}`);
          continue;
        }

        output.push(await expand(body, depth + 1, target));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Include failed for ${target}: ${message}`);
        output.push(`// include failed: ${target}`);
      } finally {
        active.delete(target);
      }
    }

    return output.join('\n');
  }

  return { text: await expand(source, 0), errors };
}

function resolveTarget(target: string, baseUrl?: string): string | null {
  if (REMOTE_RE.test(target)) {
    return target;
  }

  if (!baseUrl) {
    return null;
  }

  try {
    return new URL(target, baseUrl).toString();
  } catch {
    return null;
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      credentials: 'omit',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
