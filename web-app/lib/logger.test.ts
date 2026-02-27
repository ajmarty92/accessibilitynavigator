import { test } from 'node:test'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

test('Logger serializes Error objects correctly in production', () => {
  // Use absolute path for import in child process
  const loggerPath = path.resolve('web-app/lib/logger.ts')

  const code = `
    const { logger } = await import('${loggerPath}');
    const err = new Error('Test error');
    // Ensure the logger outputs to stdout
    logger.error('Something bad happened', err);
  `

  const result = spawnSync(process.execPath, [
    '--experimental-strip-types',
    '--input-type=module',
    '-e',
    code
  ], {
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8'
  })

  if (result.error) {
    throw result.error
  }

  // If stderr has content, something might have gone wrong, or it might be unrelated warnings
  if (result.stderr && !result.stdout) {
      // Only throw if stdout is empty, meaning the logger didn't output anything
      throw new Error(`Script failed with stderr: ${result.stderr}`)
  }

  const output = result.stdout.trim()
  assert.ok(output, 'Output should not be empty')

  try {
    const logEntry = JSON.parse(output)
    assert.strictEqual(logEntry.level, 'error')
    assert.strictEqual(logEntry.message, 'Something bad happened')
    assert.ok(logEntry.metadata, 'Metadata should exist')
    assert.ok(Array.isArray(logEntry.metadata), 'Metadata should be an array')
    assert.strictEqual(logEntry.metadata.length, 1)

    const errorObj = logEntry.metadata[0]
    assert.strictEqual(errorObj.message, 'Test error')
    assert.strictEqual(errorObj.name, 'Error')
    assert.strictEqual(typeof errorObj.stack, 'string', 'Stack trace should be present')
  } catch (e) {
    console.error('Failed to parse output or assertion failed. Output was:', output)
    throw e
  }
})

test('Logger works in development mode (smoke test)', async () => {
    // This runs in the current process (usually development)
    const { logger } = await import('./logger.ts')
    assert.ok(logger)
    logger.info('Test info')
})
