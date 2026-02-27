import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert'
import { ConsoleLogger } from './logger.ts'

describe('Logger', () => {
  // Capture original console methods
  const originalConsoleLog = console.log
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn

  let logOutput: string[] = []
  let errorOutput: string[] = []
  let warnOutput: string[] = []

  // Helper to setup mock console
  function setupMockConsole() {
    logOutput = []
    errorOutput = []
    warnOutput = []

    // We override console methods to capture output
    console.log = (msg: any) => logOutput.push(typeof msg === 'string' ? msg : JSON.stringify(msg))
    console.error = (msg: any) => errorOutput.push(typeof msg === 'string' ? msg : JSON.stringify(msg))
    console.warn = (msg: any) => warnOutput.push(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }

  // Restore console methods
  function restoreConsole() {
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  }

  afterEach(() => {
    restoreConsole()
  })

  it('production mode: logs structured JSON', () => {
    setupMockConsole()
    const logger = new ConsoleLogger(true) // Force production mode

    logger.info('Test message', { foo: 'bar' })

    // Check that we captured the log
    assert.strictEqual(logOutput.length, 1)

    // Parse the JSON output
    const logEntry = JSON.parse(logOutput[0])

    assert.strictEqual(logEntry.level, 'info')
    assert.strictEqual(logEntry.message, 'Test message')
    // Details might be an array of arguments
    assert.deepStrictEqual(logEntry.details, [{ foo: 'bar' }])
    assert.ok(logEntry.timestamp)
  })

  it('production mode: logs error as JSON to stderr', () => {
    setupMockConsole()
    const logger = new ConsoleLogger(true)
    const error = new Error('Something went wrong')

    logger.error('Error message', error)

    assert.strictEqual(errorOutput.length, 1)
    const logEntry = JSON.parse(errorOutput[0])

    assert.strictEqual(logEntry.level, 'error')
    assert.strictEqual(logEntry.message, 'Error message')
    assert.strictEqual(logEntry.details[0].message, 'Something went wrong')
    assert.strictEqual(logEntry.details[0].name, 'Error')
    assert.ok(logEntry.details[0].stack)
  })

  it('production mode: handles circular references safely', () => {
    setupMockConsole()
    const logger = new ConsoleLogger(true)
    const circular: any = { foo: 'bar' }
    circular.self = circular

    logger.info('Circular message', circular)

    // Should not throw and should log fallback
    assert.strictEqual(errorOutput.length, 1) // Fallback logs to error
    const logEntry = JSON.parse(errorOutput[0])

    assert.strictEqual(logEntry.level, 'info')
    assert.strictEqual(logEntry.message, 'Circular message')
    assert.deepStrictEqual(logEntry.details, ['[Circular or non-serializable content]'])
  })

  it('development mode: logs human readable format', () => {
    setupMockConsole()
    const logger = new ConsoleLogger(false) // Force development mode

    logger.info('Dev message')

    assert.strictEqual(logOutput.length, 1)
    // The implementation formats it like `[INFO timestamp] message`
    assert.match(logOutput[0], /\[INFO .*\] Dev message/)
  })

  it('development mode: warns with correct prefix', () => {
    setupMockConsole()
    const logger = new ConsoleLogger(false) // Force development mode

    logger.warn('Warning message')

    assert.strictEqual(warnOutput.length, 1)
    assert.match(warnOutput[0], /\[WARN .*\] Warning message/)
  })
})
