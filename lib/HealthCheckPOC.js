/* eslint-disable no-use-before-define */

'use strict'

/**
 * lexA, February 2020:
 *
 * This file is a proof on concept. I propose we check
 * if it's working fine with the "_monitor" pages of our applications.
 *
 * It's then meant to replace the Utility "IHealthCheck" in general and
 * the files "interfaces.js" and "utilities.js" as well as
 * the dependencies "component-registry" and "bluebird" in this package.
 */

const { hostname } = require('os')
const assert = require('assert')

const cache = require('@kth/in-memory-cache')

const packageFile = require('../package.json')

const logger = require('./logger')
const httpResponse = require('./httpResponse')
const systemResponse = require('./systemResponse')

/**
 * System controller support functions for /monitor
 */
class HealthCheck {
  constructor() {
    this.subSystems = []
    this.localSystem = null
    this.collectedSystemStatus = null
  }

  static getTypesEnum() {
    return {
      KTH_NODE_API: 'kth-node-api',
      KTH_NODE_API_CLIENT: 'kth-node-api-client',
      KTH_NODE_LDAP: 'kth-node-ldap',
      KTH_NODE_MONGODB: 'kth-node-mongodb',
      KTH_NODE_REDIS: 'kth-node-redis',
      KTH_NODE_SQLDB: 'kth-node-sqldb',
      KTH_NODE_AGENDA: 'kth-node-agenda'
    }
  }

  includeSubSystem(type, data, isRequired) {
    assert(typeof type === 'string', 'Invalid argument "type"')
    assert(data instanceof Object, 'Invalid argument "data"')
    assert(isRequired == null || typeof isRequired === 'boolean', 'Invalid argument "isRequired"')

    const types = HealthCheck.getTypesEnum()
    const options = { required: isRequired || false }

    const item = {}

    switch (type) {
      case types.KTH_NODE_API_CLIENT:
        item.queryAsync = () =>
          getApiClientStatus(data.client, data.key, data.endpointPath, options)
        break
      case types.KTH_NODE_API:
        item.queryAsync = () => getApiStatus(data.endpoint, options)
        break
      case types.KTH_NODE_LDAP:
        item.queryAsync = () => getLdapStatus(data.ldap, options)
        break
      case types.KTH_NODE_MONGODB:
        item.queryAsync = () => getMongoDbStatus(data.db, options)
        break
      case types.KTH_NODE_SQLDB:
        item.queryAsync = () => getSqlDbStatus(data.db, options)
        break
      case types.KTH_NODE_REDIS:
        item.queryAsync = () => getRedisStatus(data.redis, data.redisOptions, options)
        break
      case types.KTH_NODE_AGENDA:
        item.queryAsync = () => getAgendaStatus(data.agendaState, options)
        break
      default:
        // throw new Error(`Unknown subsystem type "${type}"`)
        return
    }

    this.subSystems.push(item)
  }

  setLocalSystemStatus(stateObject) {
    this.localSystem = stateObject
  }

  async queryAllStatuses() {
    const { localSystem, subSystems } = this

    this.collectedSystemStatus = await determineCollectedSystemStatus(localSystem, subSystems)
  }

  getStatusCode() {
    assert(this.collectedSystemStatus instanceof Object)

    return this.collectedSystemStatus.statusCode
  }

  getStatusObject() {
    assert(this.collectedSystemStatus instanceof Object)

    return this.collectedSystemStatus
  }

  getStatusText() {
    assert(this.collectedSystemStatus instanceof Object)

    const output = []

    output.push(`APPLICATION_STATUS: ${this.collectedSystemStatus.message}`)

    if (this.subSystems.length > 0) {
      const data = this.collectedSystemStatus.subSystems
      output.push('')
      Array.prototype.push.apply(
        output,
        Object.keys(data).map(apiKey => data[apiKey].message)
      )
    }

    output.push(
      '',
      `- local system checks: ${this.collectedSystemStatus.localSystems.message}`,
      '',
      `Hostname: ${hostname()}`
    )

    const result = output.join('\n')

    logger.log.info(`${result}`)

    return result
  }
}

const getUri = endpoint => {
  if (endpoint == null) {
    return undefined
  }
  if (endpoint.config == null) {
    return undefined
  }
  return endpoint.config.proxyBasePath
}

const logError = (key, err, message) => {
  logger.log.error({ err }, `${packageFile.name}: ${key} - ${message}`)
}

async function getApiClientStatus(client, key, endpointPath, options) {
  if (!endpointPath) {
    // We couldn't resolve the endpoint
    return httpResponse.configurationError(key, options)
  }

  // We call enpoint using pathSegment
  const requestStarted = Date.now()

  const types = HealthCheck.getTypesEnum()

  // There are two different types of api clients created by kth-node-api-call:
  if (client.getAsync) {
    // 1 -- Handle clients created with require('kth-node-api-call').BasicAPI
    try {
      const result = await client.getAsync({ uri: endpointPath })
      return httpResponse.worksOrfailed(
        key,
        result.statusCode,
        options,
        httpResponse.getRequestTimeMs(requestStarted)
      )
    } catch (error) {
      logError(
        types.KTH_NODE_API_CLIENT,
        error,
        `Caught an unexpected error when checking '${endpointPath}'.`
      )
      return httpResponse.error(key, options, httpResponse.getRequestTimeMs(requestStarted))
    }
  }

  // 2 -- Handle clients created with require('kth-node-api-call')
  try {
    await client.promisedApiCall('FreeSeatsCall')
    return httpResponse.works(key, options, httpResponse.getRequestTimeMs(requestStarted))
  } catch (err) {
    logError(
      types.KTH_NODE_API_CLIENT,
      err,
      `Caught an unexpected error when checking '${endpointPath}'.`
    )
    return httpResponse.error(key, options, httpResponse.getRequestTimeMs(requestStarted))
  }
}

async function getApiStatus(endpoint, options) {
  const endpointBaseUri = getUri(endpoint)

  // Configureation error
  if (!endpointBaseUri) {
    return httpResponse.configurationError(endpoint.key, options)
  }

  // Use cache response
  if (cache.isValid(endpointBaseUri)) {
    const cachedResponse = cache.get(endpointBaseUri)
    const cachedMessage = ' | Using previous cached response'
    if (!cachedResponse.message.includes(cachedMessage)) {
      cachedResponse.message += cachedMessage
    }
    return cachedResponse
  }

  const types = HealthCheck.getTypesEnum()

  // Fetch statuses
  const requestStarted = Date.now()

  try {
    const result = await endpoint.client.getAsync({ uri: endpointBaseUri + '/_monitor' })

    const response = httpResponse.worksOrfailed(
      endpoint.key,
      result.statusCode,
      options,
      httpResponse.getRequestTimeMs(requestStarted)
    )
    cache.add(endpointBaseUri, response)

    return response
  } catch (error) {
    logError(
      types.KTH_NODE_API,
      error,
      `Caught an unexpected error when checking '${endpointBaseUri}/_monitor'.`
    )

    const failedResponse = httpResponse.error(
      endpoint.key,
      options,
      httpResponse.getRequestTimeMs(requestStarted)
    )
    cache.remove(endpointBaseUri)

    return failedResponse
  }
}

async function getLdapStatus(ldap, options) {
  if (options && options.testSearch) {
    try {
      const result = (await ldap.testSearch(options)) || {}
      return systemResponse.worksOrfailed(systemResponse.keys.LDAP, options, result.isOk)
    } catch (error) {
      logError(systemResponse.keys.LDAP, error, 'There was an error when resolving ldap status.')
      return systemResponse.failed(systemResponse.keys.LDAP, options)
    }
  } else {
    return systemResponse.worksOrfailed(systemResponse.keys.LDAP, options, ldap.isOk)
  }
}

async function getMongoDbStatus(db, options) {
  return systemResponse.worksOrfailed(systemResponse.keys.MONGO_DB, options, db.isOk())
}

async function getSqlDbStatus(db, options) {
  try {
    await db.connect()
    return systemResponse.works(systemResponse.keys.SQL_DB, options)
  } catch (error) {
    logError(systemResponse.keys.SQL_DB, error, 'There was an error when resolving sql db status.')
    return systemResponse.failed(systemResponse.keys.SQL_DB, options)
  }
}

async function getRedisStatus(redis, redisOptions, options) {
  redisOptions.connect_timeout = 1000

  const types = HealthCheck.getTypesEnum()

  try {
    const client = await redis('HealthCheck', redisOptions)

    return new Promise(resolve => {
      client.ping(error => {
        client.quit()
        resolve(systemResponse.worksOrfailed(systemResponse.keys.REDIS, options, error == null))
      })
    })
  } catch (error) {
    logError(types.KTH_NODE_REDIS, error, `${error.message}. Host ${redisOptions.host}`)

    return systemResponse.failed(systemResponse.keys.REDIS, options, `${error.message}`)
  }
}

async function getAgendaStatus(agendaState, options) {
  return systemResponse.worksOrfailed(systemResponse.keys.AGENDA, options, agendaState)
}

async function determineCollectedSystemStatus(origLocalSystems, origSubSystems) {
  const localSystems = origLocalSystems || {
    statusCode: httpResponse.statusCodes.OK,
    message: 'No checks specified.'
  }
  const subSystems = origSubSystems || []

  const types = HealthCheck.getTypesEnum()

  try {
    const localSystemOutput = await localSystems
    const localSystemIsOkay = localSystemOutput.statusCode === httpResponse.statusCodes.OK

    const subSystemResults = await Promise.all(subSystems.map(item => item.queryAsync()))
    const subSystemOutputs = {}
    subSystemResults.forEach(status => {
      if (typeof status === 'object') {
        subSystemOutputs[status.key] = status
      }
    })
    const subSystemsAreOkay = Object.keys(subSystemOutputs).every(
      apiKey =>
        !subSystemOutputs[apiKey].required ||
        subSystemOutputs[apiKey].statusCode === httpResponse.statusCodes.OK
    )

    const systemOk = localSystemIsOkay && subSystemsAreOkay

    return {
      statusCode: systemOk
        ? httpResponse.statusCodes.OK
        : httpResponse.statusCodes.SERVICE_UNAVAILABLE,
      message: systemOk ? 'OK' : 'ERROR',
      subSystems: subSystemOutputs,
      localSystems: localSystemOutput
    }
  } catch (error) {
    logError(
      types.KTH_NODE_SYSTEM_CHECK,
      error,
      'There was an error when resolving application status.'
    )

    return {
      statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
      message: 'ERROR: ' + (error.message || `${types.KTH_NODE_SYSTEM_CHECK} Unknown error`),
      subSystems,
      localSystems
    }
  }
}

module.exports = HealthCheck
module.exports.types = HealthCheck.getTypesEnum()
