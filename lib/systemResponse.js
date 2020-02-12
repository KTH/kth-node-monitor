'use strict'

const log = require('kth-node-log')
const httpResponse = require('./httpResponse')

const keys = {
  REDIS: 'redis',
  LDAP: 'ldap',
  MONGO_DB: 'mongodb',
  SQL_DB: 'sqldb',
  AGENDA: 'agenda'
}

const worksOrfailed = (key, options, testWorked) => {
  if (testWorked) {
    return works(key, options)
  }
  return failed(key, options)
}

const works = (key, options) => {
  return getResponse(key, httpResponse.statusCodes.OK, options)
}

const failed = (key, options) => {
  return getResponse(key, httpResponse.statusCodes.SERVICE_UNAVAILABLE, options)
}

const getResponse = (key, statusCode, options) => {
  return {
    key: key,
    statusCode: statusCode,
    required: isRequired(options),
    message: getMessage(key, statusCode, isRequired(options))
  }
}

function getMessage(key, statusCode, required) {
  if (httpResponse.isOk(statusCode)) {
    return `- ${key}: OK | Required to work: ${required}`
  }

  if (required) {
    return `- ${key}: Error | This service has to work for the APPLICATION_STATUS to say OK. | Ref: ${getUniqueReferens()}`
  }

  return `- ${key}: Error | The application can still function without this service functioning properly. | Ref: ${getUniqueReferens()}`
}

const isRequired = options => {
  if (options == null) {
    return false
  }

  if (options.required == null) {
    return false
  }
  return ('' + options.required).toLowerCase() === 'true'
}

const getUniqueReferens = () => {
  return Math.random()
    .toString(36)
    .substring(2)
}

/**
 * Module exports
 */
module.exports = {
  keys: keys,
  works: works,
  failed: failed,
  worksOrfailed: worksOrfailed
}
