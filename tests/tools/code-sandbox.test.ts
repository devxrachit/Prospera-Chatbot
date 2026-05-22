import { describe, it, expect } from 'vitest';
import { codeSandboxTool } from '@/lib/tools/code-sandbox';

const exec = codeSandboxTool.execute!;
const opts = { toolCallId: 'test', messages: [] as [] };

describe('codeSandboxTool', () => {
  it('evaluates arithmetic and returns the result', async () => {
    const r = await exec({ code: '2 + 2 * 3' }, opts);
    expect(r.success).toBe(true);
    expect(r.result).toBe('8');
  });

  it('captures console.log output', async () => {
    const r = await exec({ code: 'console.log("hello"); console.log("world"); 42' }, opts);
    expect(r.success).toBe(true);
    expect(r.output).toEqual(['hello', 'world']);
    expect(r.result).toBe('42');
  });

  it('handles runtime errors gracefully', async () => {
    const r = await exec({ code: 'null.toString()' }, opts);
    expect(r.success).toBe(false);
    expect(r).toHaveProperty('error');
  });

  it('blocks access to process', async () => {
    const r = await exec({ code: 'process.env' }, opts);
    expect(r.success).toBe(false);
  });

  it('blocks access to require', async () => {
    const r = await exec({ code: 'require("fs")' }, opts);
    expect(r.success).toBe(false);
  });

  it('times out on infinite loops', async () => {
    const r = await exec({ code: 'while (true) {}' }, opts);
    expect(r.success).toBe(false);
    expect(String(r.error).toLowerCase()).toMatch(/time/);
  }, 10_000);

  it('supports standard globals — Math, Array, JSON', async () => {
    const r = await exec(
      { code: 'JSON.stringify(Array.from({length:3},(_,i)=>Math.pow(2,i)))' },
      opts,
    );
    expect(r.success).toBe(true);
    expect(r.result).toBe('[1,2,4]');
  });
});
