/* eslint no-use-before-define: ["error", "nofunc"] */

// @ts-check

/**
 * System controller support functions for /monitor
 */
const Promise = require('bluebird')
const { hostname } = require('os')
const registry = require('component-registry').globalRegistry
const { createUtility } = require('component-registry')

const logger = require('./logger')
const httpResponse = require('./httpResponse')
const interfaces = require('./interfaces')
const packageFile = require('../package.json')

const Status = require('./getStatus')

const logError = (key, err, message) => {
  logger.log.error({ err }, `${packageFile.name}: ${key} - ${message}`)
}

// TODO: We should probably cache kth-node-api-client requests but need to consider how
// to construct the cache key properly (preferably a fully qualified URI)
createUtility({
  implements: interfaces.IHealthCheck,
  name: interfaces.names.KTH_NODE_API_CLIENT,

  status: (client, key, endpointPath, options) =>
    Status.getApiClientStatus(
      { client, key, endpointPath },
      { ...options, name: interfaces.names.KTH_NODE_API_CLIENT }
    ),
}).registerWith(registry)

createUtility({
  implements: interfaces.IHealthCheck,
  name: interfaces.names.KTH_NODE_API,

  status: (endpoint, options) => Status.getApiStatus({ endpoint }, { ...options, name: interfaces.names.KTH_NODE_API }),
}).registerWith(registry)

createUtility({
  implements: interfaces.IHealthCheck,
  name: interfaces.names.KTH_NODE_LDAP,

  status: (ldap, options) =>
    Status.getLdapStatus({ ldap, options }, { ...options, name: interfaces.names.KTH_NODE_LDAP }),
}).registerWith(registry)

createUtility({
  implements: interfaces.IHealthCheck,
  name: interfaces.names.KTH_NODE_MONGODB,

  status: (db, options) => Status.getMongoDbStatus({ db }, { ...options, name: interfaces.names.KTH_NODE_MONGODB }),
}).registerWith(registry)

createUtility({
  implements: interfaces.IHealthCheck,
  name: interfaces.names.KTH_NODE_SQLDB,

  status: (db, options) => Status.getSqlDbStatus({ db }, { ...options, name: interfaces.names.KTH_NODE_SQLDB }),
}).registerWith(registry)

createUtility({
  implements: interfaces.IHealthCheck,
  name: interfaces.names.KTH_NODE_REDIS,

  status: (redis, redisOptions, options) =>
    Status.getRedisStatus({ redis, redisOptions }, { ...options, name: interfaces.names.KTH_NODE_REDIS }),
}).registerWith(registry)

createUtility({
  implements: interfaces.IHealthCheck,
  name: interfaces.names.KTH_NODE_AGENDA,

  status: (agendaState, options) =>
    Status.getAgendaStatus({ agendaState }, { ...options, name: interfaces.names.KTH_NODE_AGENDA }),
}).registerWith(registry)

createUtility({
  implements: interfaces.IHealthCheck,
  name: interfaces.names.KTH_NODE_SYSTEM_CHECK,

  status(localSystems, subSystems) {
    localSystems =
      localSystems ||
      Promise.resolve({
        statusCode: httpResponse.statusCodes.OK,
        message: 'No checks specified.',
      })
    // Handle if we don't have subsystems
    subSystems = subSystems || [Promise.resolve(undefined)]

    // Consolidate all results
    return Promise.all(subSystems)
      .then(results => {
        const outp = {}
        results.forEach(status => {
          if (typeof status === 'object') {
            outp[status.key] = status
          }
        })
        return Promise.resolve(outp)
      })
      .then(subSystems2 => {
        return localSystems.then(result => Promise.resolve({ localSystems: result, subSystems: subSystems2 }))
      })
      .then(result => {
        const { subSystems: subSystems2, localSystems: localSystems2 } = result

        const systemOk = Object.keys(subSystems2).reduce((systemOk2, apiKey) => {
          return (
            systemOk2 &&
            (subSystems2[apiKey].required ? subSystems2[apiKey].statusCode === httpResponse.statusCodes.OK : true)
          )
        }, localSystems2.statusCode === httpResponse.statusCodes.OK)

        return {
          statusCode: systemOk ? httpResponse.statusCodes.OK : httpResponse.statusCodes.SERVICE_UNAVAILABLE,
          message: systemOk ? 'OK' : 'ERROR',
          subSystems: subSystems2,
          localSystems: localSystems2,
        }
      })
      .catch(err => {
        logError(interfaces.names.KTH_NODE_SYSTEM_CHECK, err, 'There was an error when resolving application status.')
        return {
          statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
          message: 'ERROR: ' + (err.message || `${interfaces.names.KTH_NODE_SYSTEM_CHECK} Unknown error`),
          subSystems,
          localSystems,
        }
      })
  },

  renderJSON(systemHealth) {
    return systemHealth
  },

  renderText(systemHealth) {
    let result = `APPLICATION_STATUS: ${systemHealth.message}\n\n`
    result += Object.keys(systemHealth.subSystems)
      .map(apiKey => {
        return systemHealth.subSystems[apiKey].message
      })
      .join('\n')

    result += `\n\n- local system checks: ${systemHealth.localSystems.message}\n\n`
    result += `Hostname: ${hostname()}`
    logger.log.info(`${result}`)
    return result
  },
}).registerWith(registry)
