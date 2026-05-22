import { tool } from 'ai';
import { z } from 'zod';
import vm from 'node:vm';

/**
 * Safe-enough JS sandbox for portfolio/demo use.
 * Uses node:vm with a restricted context and 5s timeout.
 * Production note: replace with E2B (https://e2b.dev) or Cloudflare Workers
 * for true process isolation — node:vm can be escaped by determined actors.
 */
export const codeSandboxTool = tool({
  description:
    'Execute JavaScript code for calculations, data processing, algorithm demonstrations, or any computation. Returns stdout output and the final expression value.',
  parameters: z.object({
    code: z.string().describe('JavaScript code to execute (ES2022, no Node.js APIs)'),
    description: z
      .string()
      .optional()
      .describe('Brief description of what this code does'),
  }),
  execute: async ({ code }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    const sandbox: Record<string, unknown> = {
      console: {
        log: (...args: unknown[]) => logs.push(args.map(stringify).join(' ')),
        error: (...args: unknown[]) => errors.push(args.map(stringify).join(' ')),
        warn: (...args: unknown[]) => logs.push('[warn] ' + args.map(stringify).join(' ')),
        info: (...args: unknown[]) => logs.push('[info] ' + args.map(stringify).join(' ')),
        table: (data: unknown) => logs.push(JSON.stringify(data, null, 2)),
      },
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      Map,
      Set,
      RegExp,
      Error,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      Promise,
    };

    try {
      const context = vm.createContext(sandbox);
      const result = vm.runInContext(code, context, {
        timeout: 5_000,
        displayErrors: true,
      });

      return {
        success: true as const,
        result: result !== undefined ? stringify(result) : undefined,
        output: logs,
        errors,
      };
    } catch (err: unknown) {
      return {
        success: false as const,
        error: err instanceof Error ? err.message : String(err),
        output: logs,
        errors,
      };
    }
  },
});

function stringify(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}
