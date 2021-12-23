const logger = require('@kth/log')
const packageFile = require('../package.json')

/**
 * Module exports
 */
module.exports = {
  log: logger.child(),
}
