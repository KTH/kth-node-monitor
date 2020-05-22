/* eslint no-use-before-define: ["error", "nofunc"] */

// @ts-check

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

const packageFile = require('../package.json')

const Status = require('./getStatus')
const logger = require('./logger')
const httpResponse = require('./httpResponse')

const logError = (key, err, message) => {
  logger.log.error({ err }, `${packageFile.name}: ${key} - ${message}`)
}

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
      queryFunc: Status.getApiClientStatus,
    })

    supportedSystems.push({
      name: 'kth-node-api',
      includeSuffix: 'Api',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        // assert(data.endpoint)
      },
      queryFunc: Status.getApiStatus,
    })

    supportedSystems.push({
      name: 'kth-node-ldap',
      includeSuffix: 'Ldap',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.ldap)
        // assert(data.options instanceof Object)
      },
      queryFunc: Status.getLdapStatus,
    })

    supportedSystems.push({
      name: 'kth-node-mongo-db',
      includeSuffix: 'MongoDb',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.db)
      },
      queryFunc: Status.getMongoDbStatus,
    })

    supportedSystems.push({
      name: 'kth-node-redis',
      includeSuffix: 'Redis',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.redis)
        assert(data.redisOptions)
      },
      queryFunc: Status.getRedisStatus,
    })

    supportedSystems.push({
      name: 'kth-node-sql-db',
      includeSuffix: 'SqlDb',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        assert(data.db)
      },
      queryFunc: Status.getSqlDbStatus,
    })

    supportedSystems.push({
      name: 'kth-node-agenda',
      includeSuffix: 'Agenda',
      includeDataIsValid: data => {
        assert(data instanceof Object)
        // assert(data.agendaState != null)
      },
      queryFunc: Status.getAgendaStatus,
    })

    return supportedSystems
  }

  constructor() {
    this.subSystems = []
    this.localSystem = null

    this.collectedSystemStatus = null

    this._prepareAllIncludeMethods()
  }

  __fakeDummyIncludeMethodsOnlyToInformJsDoc() {
    /**
     * @param {object} data Input data for sub-system (see documentation)
     * @returns {object} HealthCheck instance to allow chaining
     */
    // eslint-disable-next-line no-unused-vars
    const dummyIncludeWithObject = data => {}

    /**
     * @param {object} data Input data for sub-system (see documentation)
     * @param {boolean} isRequired True iff the given sub-system is required for the application-status to be okay
     * @returns {object} HealthCheck instance to allow chaining
     */
    // eslint-disable-next-line no-unused-vars
    const dummyIncludeWithObjectAndBoolean = (data, isRequired) => {}

    this.includeRequiredApiClient = dummyIncludeWithObject
    this.includeOptionalApiClient = dummyIncludeWithObject
    this.includeApiClient = dummyIncludeWithObjectAndBoolean

    this.includeRequiredApi = dummyIncludeWithObject
    this.includeOptionalApi = dummyIncludeWithObject
    this.includeApi = dummyIncludeWithObjectAndBoolean

    this.includeRequiredLdap = dummyIncludeWithObject
    this.includeOptionalLdap = dummyIncludeWithObject
    this.includeLdap = dummyIncludeWithObjectAndBoolean

    this.includeRequiredMongoDb = dummyIncludeWithObject
    this.includeOptionalMongoDb = dummyIncludeWithObject
    this.includeMongoDb = dummyIncludeWithObjectAndBoolean

    this.includeRequiredRedis = dummyIncludeWithObject
    this.includeOptionalRedis = dummyIncludeWithObject
    this.includeRedis = dummyIncludeWithObjectAndBoolean

    this.includeRequiredSqlDb = dummyIncludeWithObject
    this.includeOptionalSqlDb = dummyIncludeWithObject
    this.includeSqlDb = dummyIncludeWithObjectAndBoolean

    this.includeRequiredAgenda = dummyIncludeWithObject
    this.includeOptionalAgenda = dummyIncludeWithObject
    this.includeAgenda = dummyIncludeWithObjectAndBoolean
  }

  _prepareAllIncludeMethods() {
    const systems = HealthCheck._listSupportedSystems()

    systems.forEach(item => {
      const { name, includeSuffix } = item

      assert(typeof name === 'string' && name !== '')
      assert(typeof includeSuffix === 'string' && includeSuffix !== '')

      this[`includeRequired${includeSuffix}`] = this._prepareSingleIncludeMethod(item, {
        name,
        required: true,
      })
      this[`includeOptional${includeSuffix}`] = this._prepareSingleIncludeMethod(item, {
        name,
        required: false,
      })
      this[`include${includeSuffix}`] = this._prepareSingleIncludeMethod(item, { name }, true)
    })
  }

  _prepareSingleIncludeMethod(item, options, determineIsRequiredByArgument = false) {
    const { includeDataIsValid, queryFunc } = item

    assert(typeof queryFunc === 'function')

    return (data, required) => {
      if (typeof includeDataIsValid === 'function') {
        includeDataIsValid(data)
      }
      const newSubSystem = determineIsRequiredByArgument
        ? { queryAsync: () => queryFunc(data, { ...options, required }) }
        : { queryAsync: () => queryFunc(data, options) }
      this.subSystems.push(newSubSystem)
      return this
    }
  }

  setLocalSystemStatus(stateObject) {
    this.localSystem = stateObject
  }

  async queryAllStatuses() {
    const { localSystem, subSystems } = this

    this.collectedSystemStatus = await HealthCheck._determineCollectedSystemStatus(localSystem, subSystems)
  }

  static async _determineCollectedSystemStatus(origLocalSystems, origSubSystems) {
    const localSystems = origLocalSystems || {
      statusCode: httpResponse.statusCodes.OK,
      message: 'No checks specified.',
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
          !subSystemOutputs[apiKey].required || subSystemOutputs[apiKey].statusCode === httpResponse.statusCodes.OK
      )

      const systemOk = localSystemIsOkay && subSystemsAreOkay

      return {
        statusCode: systemOk ? httpResponse.statusCodes.OK : httpResponse.statusCodes.SERVICE_UNAVAILABLE,
        message: systemOk ? 'OK' : 'ERROR',
        subSystems: subSystemOutputs,
        localSystems: localSystemOutput,
      }
    } catch (error) {
      logError('HealthCheck', error, 'There was an error when resolving application status.')

      return {
        statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
        message: 'ERROR: ' + (error.message || `HealthCheck Unknown error`),
        subSystems,
        localSystems,
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

    const memoryUsage = HealthCheck._describeMemoryUsage()

    output.push(
      '',
      `- Local system checks: ${this.collectedSystemStatus.localSystems.message}`,
      '',
      `Hostname: ${hostname()}`,
      `Memory usage: ${memoryUsage}`,
      '(HealthCheckPOC)'
    )

    const result = output.join('\n')

    logger.log.info(`${result}`)

    return result
  }

  static _describeMemoryUsage() {
    const data = process.memoryUsage()

    const memoryString = Object.keys(data)
      .map(key => {
        const megaBytes = Math.round((data[key] / 1024 / 1024) * 10) / 10
        return `${megaBytes} MB ${key}`
      })
      .join(', ')

    return memoryString
  }
}

module.exports = HealthCheck
