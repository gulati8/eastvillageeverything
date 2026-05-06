import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

async function loadStorage(env: Record<string, string>): Promise<typeof import('../../src/storage/index')> {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  let mod!: typeof import('../../src/storage/index');
  await jest.isolateModulesAsync(async () => {
    mod = await import('../../src/storage/index');
  });
  return mod;
}

describe('storage adapter (FS driver)', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes a buffer and reports the public URL', async () => {
    const { putObject } = await loadStorage({
      STORAGE_BACKEND: 'local',
      STORAGE_LOCAL_DIR: tmpDir,
      STORAGE_LOCAL_URL_PREFIX: '/uploads',
    });

    const result = await putObject(Buffer.from('hello'), {
      key: 'tag/test.txt',
      contentType: 'text/plain',
    });

    expect(result.url).toBe('/uploads/tag/test.txt');
    expect(result.key).toBe('tag/test.txt');

    const written = await fs.readFile(path.join(tmpDir, 'tag/test.txt'), 'utf8');
    expect(written).toBe('hello');
  });

  it('throws if STORAGE_BACKEND is unknown', async () => {
    process.env.STORAGE_BACKEND = 'mysql';
    await expect(
      jest.isolateModulesAsync(async () => { await import('../../src/storage/index'); })
    ).rejects.toThrow(/STORAGE_BACKEND/);
  });
});
