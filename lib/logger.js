const logger = require('kth-node-log')
const packageFile = require('../package.json')

/**
 * Gets the log level passed as env LOG_LEVEL
 * or defaults to info.
 *
 * Levels are:
 * log.info('hello from info, log level usually used in setup')
 * log.warn('error that code handled and can recover from')
 * log.error({err: err}, 'error that should be fixed in code')
 * log.fatal('a really bad error that will crash the application')
 * log.debug({req: request, res: res}, 'log a request and response, basic dev log')
 * log.trace('granular logging, rarely used')
 */
const getLogLevel = function getLogLevel() {
  const result = process.env.LOG_LEVEL || 'info'

  // eslint-disable-next-line no-console
  console.log(`Loglevel: '${result}'`)

  return result
}

/**
 * Set logging to the level specified in env LOG_LEVEL
 * or use default.
 */
logger.init({
  name: packageFile.name,
  app: packageFile.name,
  level: getLogLevel(),
})

/**
 * Module exports
 */
module.exports = {
  log: logger,
}