/**
 * Behavior matrix for the generated `docker-entrypoint.sh`. The script is the
 * spine of the 0.9.8 security release: it gates JWT_SECRET handling at
 * container start. shellcheck (CI step) catches syntax regressions; this spec
 * catches semantic ones.
 *
 * Each `it(...)` invokes the rendered entrypoint with a different JWT_SECRET
 * env value via `bash <entrypoint> /usr/bin/env`, then asserts:
 *   - exit code (0 for valid, 1 for sentinel rejection)
 *   - stderr message (WARNING / FATAL / INFO)
 *   - resulting JWT_SECRET value (random when unset, preserved when supplied)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'rust-server';
const SUB_GENERATOR_NAMESPACE = `jhipster-rust:${SUB_GENERATOR}`;

describe('docker-entrypoint.sh behavior matrix', () => {
  let entrypointPath;
  let scratchDir;

  beforeAll(async function () {
    await helpers
      .run(SUB_GENERATOR_NAMESPACE)
      .withJHipsterConfig({
        baseName: 'testApp',
        applicationType: 'monolith',
        skipClient: true,
      })
      .withOptions({
        ignoreNeedlesError: true,
        blueprint: ['rust'],
      })
      .withJHipsterGenerators()
      .withConfiguredBlueprint();

    // yo-helpers writes to an in-memory fs (mem-fs), not the real disk.
    // Read the rendered entrypoint via result.fs.read and materialize it to a
    // real tmp file so we can spawn bash on it.
    const rendered = result.fs.read(`${result.cwd}/docker-entrypoint.sh`);
    if (!rendered) {
      throw new Error('docker-entrypoint.sh was not rendered by the generator');
    }
    scratchDir = mkdtempSync(join(tmpdir(), 'entrypoint-spec-'));
    entrypointPath = join(scratchDir, 'docker-entrypoint.sh');
    writeFileSync(entrypointPath, rendered, { mode: 0o755 });
  });

  afterAll(() => {
    if (scratchDir) {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  /**
   * Spawn the entrypoint with the given env, executing /usr/bin/env as CMD so
   * the resulting JWT_SECRET is observable on stdout.
   */
  const runEntrypoint = env => {
    const child = spawnSync('bash', [entrypointPath, '/usr/bin/env'], {
      env: {
        // bash needs PATH to find head, od, tr. Drop everything else for hygiene.
        PATH: process.env.PATH,
        ...env,
      },
      encoding: 'utf-8',
    });
    const stdout = child.stdout || '';
    const stderr = child.stderr || '';
    const jwtSecretLine = stdout.split('\n').find(l => l.startsWith('JWT_SECRET='));
    const jwtSecret = jwtSecretLine ? jwtSecretLine.slice('JWT_SECRET='.length) : null;
    return { status: child.status, stderr, stdout, jwtSecret };
  };

  it('JWT_SECRET unset → WARNING + 64-char hex generated, exit 0', () => {
    const { status, stderr, jwtSecret } = runEntrypoint({});
    expect(status).toBe(0);
    expect(stderr).toContain('WARNING: JWT_SECRET unset');
    expect(jwtSecret).toMatch(/^[0-9a-f]{64}$/);
  });

  it('JWT_SECRET = "change-me-in-production-..." sentinel → FATAL, exit 1', () => {
    const { status, stderr } = runEntrypoint({
      JWT_SECRET: 'change-me-in-production-use-a-secure-random-string',
    });
    expect(status).toBe(1);
    expect(stderr).toContain('FATAL');
    expect(stderr).toContain('known-default sentinel');
  });

  it('JWT_SECRET = "your-super-secret-jwt-key-..." sentinel → FATAL, exit 1', () => {
    const { status, stderr } = runEntrypoint({
      JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
    });
    expect(status).toBe(1);
    expect(stderr).toContain('FATAL');
  });

  it('JWT_SECRET matching wildcard "*-jwt-secret-key-change-in-production-*" → FATAL, exit 1', () => {
    // Matches the pre-0.9.8 timestamp default emitted by env.ejs:39.
    const { status, stderr } = runEntrypoint({
      JWT_SECRET: 'myapp-jwt-secret-key-change-in-production-1777834673587',
    });
    expect(status).toBe(1);
    expect(stderr).toContain('FATAL');
  });

  it('JWT_SECRET = legitimate operator value → INFO, exit 0, value preserved', () => {
    const operatorValue = 'a'.repeat(64);
    const { status, stderr, jwtSecret } = runEntrypoint({
      JWT_SECRET: operatorValue,
    });
    expect(status).toBe(0);
    expect(stderr).toContain('INFO: JWT_SECRET supplied by operator');
    expect(jwtSecret).toBe(operatorValue);
  });

  it('exec "$@" passes through to the next argument unchanged', () => {
    // Sanity check that exec didn't mangle CMD. /usr/bin/env should print
    // PATH= line at minimum.
    const { status, stdout } = runEntrypoint({ JWT_SECRET: 'b'.repeat(64) });
    expect(status).toBe(0);
    expect(stdout).toMatch(/^PATH=/m);
  });
});
