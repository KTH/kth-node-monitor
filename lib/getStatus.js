/* eslint no-use-before-define: ["error", "nofunc"] */

// @ts-check

module.exports = {
  getApiClientStatus,
  getApiStatus,
  getLdapStatus,
  getMongoDbStatus,
  getRedisStatus,
  getSqlDbStatus,
  getAgendaStatus,
}

const cache = require('@kth/in-memory-cache')

const packageFile = require('../package.json')

const logger = require('./logger')
const httpResponse = require('./httpResponse')
const systemResponse = require('./systemResponse')

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
      return httpResponse.worksOrfailed(key, result.statusCode, options, httpResponse.getRequestTimeMs(requestStarted))
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

    const failedResponse = httpResponse.error(endpoint.key, options, httpResponse.getRequestTimeMs(requestStarted))
    cache.remove(endpointBaseUri)

    return failedResponse
  }
}

async function getLdapStatus(data, options) {
  const { ldap, options: dataOptions } = data

  if (dataOptions != null && typeof dataOptions === 'object' && dataOptions.testSearch) {
    try {
      const result = (await ldap.testSearch(dataOptions)) || {}
      return systemResponse.worksOrfailed(systemResponse.keys.LDAP, options, result.isOk)
    } catch (error) {
      logError(systemResponse.keys.LDAP, error, 'There was an error when resolving ldap status.')
      return systemResponse.failed(systemResponse.keys.LDAP, options)
    }
  }

  return systemResponse.worksOrfailed(systemResponse.keys.LDAP, options, ldap.isOk)
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
        resolve(systemResponse.worksOrfailed(systemResponse.keys.REDIS, options, error == null))
      })
    })
  } catch (error) {
    logError(name, error, `${error.message}. Host ${redisOptions.host}`)
    return systemResponse.failed(systemResponse.keys.REDIS, options, error.message)
  }
}

async function getAgendaStatus(data, options) {
  const { agendaState } = data

  return systemResponse.worksOrfailed(systemResponse.keys.AGENDA, options, agendaState)
}
