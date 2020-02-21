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

class HealthCheck {
  /**
   * All sub-system which shall be supported by this controller must be configured
   * in this helper function. The configuration object shall contain those properties:
   * - name {string}:
   *      Description or identifier of the sub-system which will be used in related outputs
   * - includeSuffix {string}:
   *      Second part for the names of the two related include methods, e.g.
   *          "ApiClient" for "includeRequiredApiClient" and "includeOptionalApiClient"
   * - includeDataIsValid {function}:
   *      (optional) Synchronous callback which will be used to ensure
   *      that the data argument which is given to a related include method is valid
   * - queryFunc {function}:
   *      Callback which will be used during queryAllStatuses() to determine the current
   *      status of the sub-system. It might run asynchronously.
   *      The callback will be invoked with two arguments: the data from the used include method
   *      and internal options (e.g. { name: "kth-node-api-client", required: true })
   *
   * @returns {object}
   *    internal configuration of all supported sub-systems
   */
  static _listSupportedSystems() {
    const supportedSystems = []

    supportedSystems.push({
      name: 'kth-node-api-client',
      includeSuffix: 'ApiClient',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.client)
        assert(data.key)
        // assert(data.endpointPath)
      },
      queryFunc: getApiClientStatus
    })

    supportedSystems.push({
      name: 'kth-node-api',
      includeSuffix: 'Api',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        // assert(data.endpoint)
      },
      queryFunc: getApiStatus
    })

    supportedSystems.push({
      name: 'kth-node-ldap',
      includeSuffix: 'Ldap',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.ldap)
      },
      queryFunc: getLdapStatus
    })

    supportedSystems.push({
      name: 'kth-node-mongo-db',
      includeSuffix: 'MongoDb',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.db)
      },
      queryFunc: getMongoDbStatus
    })

    supportedSystems.push({
      name: 'kth-node-redis',
      includeSuffix: 'Redis',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.redis)
        assert(data.redisOptions)
      },
      queryFunc: getRedisStatus
    })

    supportedSystems.push({
      name: 'kth-node-sql-db',
      includeSuffix: 'SqlDb',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.db)
      },
      queryFunc: getSqlDbStatus
    })

    supportedSystems.push({
      name: 'kth-node-agenda',
      includeSuffix: 'Agenda',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.agendaState != null)
      },
      queryFunc: getAgendaStatus
    })

    return supportedSystems
  }

  constructor() {
    this.subSystems = []
    this.localSystem = null

    this.collectedSystemStatus = null

    this._prepareAllIncludeMethods()
  }

  _prepareAllIncludeMethods() {
    const systems = HealthCheck._listSupportedSystems()

    systems.forEach(item => {
      const { name, includeSuffix } = item

      assert(typeof name === 'string' && name !== '')
      assert(typeof includeSuffix === 'string' && includeSuffix !== '')

      this[`includeRequired${includeSuffix}`] = this._prepareSingleIncludeMethod(item, {
        name,
        required: true
      })
      this[`includeOptional${includeSuffix}`] = this._prepareSingleIncludeMethod(item, {
        name,
        required: false
      })
    })
  }

  _prepareSingleIncludeMethod(item, options) {
    const { includeDataIsValid, queryFunc } = item

    assert(typeof queryFunc === 'function')

    return data => {
      if (typeof includeDataIsValid === 'function') {
        includeDataIsValid(data)
      }
      const newSubSystem = {
        queryAsync: () => queryFunc(data, options)
      }
      this.subSystems.push(newSubSystem)
    }
  }

  setLocalSystemStatus(stateObject) {
    this.localSystem = stateObject
  }

  async queryAllStatuses() {
    const { localSystem, subSystems } = this

    this.collectedSystemStatus = await HealthCheck._determineCollectedSystemStatus(
      localSystem,
      subSystems
    )
  }

  static async _determineCollectedSystemStatus(origLocalSystems, origSubSystems) {
    const localSystems = origLocalSystems || {
      statusCode: httpResponse.statusCodes.OK,
      message: 'No checks specified.'
    }
    const subSystems = origSubSystems || []

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
      logError('HealthCheck', error, 'There was an error when resolving application status.')

      return {
        statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
        message: 'ERROR: ' + (error.message || `HealthCheck Unknown error`),
        subSystems,
        localSystems
      }
    }
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
      `Hostname: ${hostname()}`,
      '(HealthCheckPOC)'
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

async function getApiClientStatus(data, options) {
  const { client, key, endpointPath } = data
  const { name } = options

  if (!endpointPath) {
    // We couldn't resolve the endpoint
    return httpResponse.configurationError(key, options)
  }

  // We call enpoint using pathSegment
  const requestStarted = Date.now()

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
      logError(name, error, `Caught an unexpected error when checking '${endpointPath}'.`)
      return httpResponse.error(key, options, httpResponse.getRequestTimeMs(requestStarted))
    }
  }

  // 2 -- Handle clients created with require('kth-node-api-call')
  try {
    await client.promisedApiCall('FreeSeatsCall')
    return httpResponse.works(key, options, httpResponse.getRequestTimeMs(requestStarted))
  } catch (err) {
    logError(name, err, `Caught an unexpected error when checking '${endpointPath}'.`)
    return httpResponse.error(key, options, httpResponse.getRequestTimeMs(requestStarted))
  }
}

async function getApiStatus(data, options) {
  const { endpoint } = data
  const { name } = options

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
    logError(name, error, `Caught an unexpected error when checking '${endpointBaseUri}/_monitor'.`)

    const failedResponse = httpResponse.error(
      endpoint.key,
      options,
      httpResponse.getRequestTimeMs(requestStarted)
    )
    cache.remove(endpointBaseUri)

    return failedResponse
  }
}

async function getLdapStatus(data, options) {
  const { ldap, options: dataOptions } = data

  if (dataOptions && dataOptions.testSearch) {
    try {
      const result = (await ldap.testSearch(dataOptions)) || {}
      return systemResponse.worksOrfailed(systemResponse.keys.LDAP, options, result.isOk)
    } catch (error) {
      logError(systemResponse.keys.LDAP, error, 'There was an error when resolving ldap status.')
      return systemResponse.failed(systemResponse.keys.LDAP, options)
    }
  } else {
    return systemResponse.worksOrfailed(systemResponse.keys.LDAP, options, ldap.isOk)
  }
}

async function getMongoDbStatus(data, options) {
  const { db } = data

  return systemResponse.worksOrfailed(systemResponse.keys.MONGO_DB, options, db.isOk())
}

async function getSqlDbStatus(data, options) {
  const { db } = data

  try {
    await db.connect()
    return systemResponse.works(systemResponse.keys.SQL_DB, options)
  } catch (error) {
    logError(systemResponse.keys.SQL_DB, error, 'There was an error when resolving sql db status.')
    return systemResponse.failed(systemResponse.keys.SQL_DB, options)
  }
}

async function getRedisStatus(data, options) {
  const { redis, redisOptions } = data
  const { name } = options

  redisOptions.connect_timeout = 1000

  try {
    const client = await redis('HealthCheck', redisOptions)

    return new Promise(resolve => {
      client.ping(error => {
        client.quit()
        resolve(systemResponse.worksOrfailed(systemResponse.keys.REDIS, options, error == null))
      })
    })
  } catch (error) {
    logError(name, error, `${error.message}. Host ${redisOptions.host}`)

    return systemResponse.failed(systemResponse.keys.REDIS, options, `${error.message}`)
  }
}

async function getAgendaStatus(data, options) {
  const { agendaState } = data

  return systemResponse.worksOrfailed(systemResponse.keys.AGENDA, options, agendaState)
}

module.exports = HealthCheck
