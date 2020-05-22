/* eslint-disable no-use-before-define */

// eslint-disable-next-line no-console
console.log = jest.fn()
Math.random = jest.fn().mockReturnValue(0.79)

// eslint-disable-next-line import/newline-after-import
const log = require('kth-node-log')
jest.mock('kth-node-log')
log.info = jest.fn()
log.error = jest.fn()

// eslint-disable-next-line import/newline-after-import
const cache = require('@kth/in-memory-cache')
jest.mock('@kth/in-memory-cache')
cache.add.mockReturnValue()

const httpResponse = require('./httpResponse')

module.exports = {
  getTestDataForIncludeMethod,
}

function getTestDataForIncludeMethod(subSystemName) {
  const testError = new Error('test-error')
  const positiveResult = { statusCode: httpResponse.statusCodes.OK, message: 'OK' }
  const resolvingGetClient = { getAsync: jest.fn().mockResolvedValue(positiveResult) }
  const rejectingGetClient = { getAsync: jest.fn().mockRejectedValue(testError) }

  const _expectOutputToMatchSituation = (result, isSubSystemSuccessful, secondCaption) => {
    const { text, mode } = result
    if (!isSubSystemSuccessful && mode === 'Required') {
      expect(text).toMatch('APPLICATION_STATUS: ERROR')
    } else {
      expect(text).toMatch('APPLICATION_STATUS: OK')
    }
    expect(text).toMatch(secondCaption)
  }

  const setupList = []

  switch (subSystemName) {
    case 'kth-node-api-client':
      setupList.push({
        description: 'failing to resolve endpoint',
        client: {},
        key: 'testApiClient',
        endpointPath: null,
        after: result => _expectOutputToMatchSituation(result, false, 'testApiClient: ERROR'),
      })
      setupList.push({
        description: 'configured with BasicAPI',
        client: resolvingGetClient,
        key: 'testApiClient',
        endpointPath: 'test-path',
        after: result => _expectOutputToMatchSituation(result, true, 'testApiClient: OK'),
      })
      setupList.push({
        description: 'failing with BasicAPI',
        client: { getAsync: jest.fn().mockRejectedValue(testError) },
        key: 'testApiClient',
        endpointPath: 'test-path',
        after: result => _expectOutputToMatchSituation(result, false, 'testApiClient: ERROR'),
      })
      setupList.push({
        description: 'configured with generic API',
        client: { promisedApiCall: jest.fn() },
        key: 'testApiClient',
        endpointPath: 'test-path',
        after: result => _expectOutputToMatchSituation(result, true, 'testApiClient: OK'),
      })
      setupList.push({
        description: 'failing with generic API',
        client: { promisedApiCall: jest.fn().mockRejectedValue(testError) },
        key: 'testApiClient',
        endpointPath: 'test-path',
        after: result => _expectOutputToMatchSituation(result, false, 'testApiClient: ERROR'),
      })
      return setupList

    case 'kth-node-api':
      setupList.push({
        description: 'failing because of missing base path',
        endpoint: { config: { proxyBasePath: '' }, key: 'testApi' },
        after: result => _expectOutputToMatchSituation(result, false, 'testApi: ERROR'),
      })
      setupList.push({
        description: 'normal configuration with cache',
        before: () => {
          cache.isValid.mockReturnValue(true)
          cache.get.mockReturnValue(positiveResult)
        },
        endpoint: {
          key: 'testApi',
          config: { proxyBasePath: 'test-path' },
          client: resolvingGetClient,
        },
        after: result => _expectOutputToMatchSituation(result, true, 'OK | Using previous cached response'),
      })
      setupList.push({
        description: 'normal configuration w/o cache',
        before: () => cache.isValid.mockReturnValue(false),
        endpoint: {
          key: 'testApi',
          config: { proxyBasePath: 'test-path' },
          client: resolvingGetClient,
        },
        after: result => _expectOutputToMatchSituation(result, true, 'testApi: OK'),
      })
      setupList.push({
        description: 'failing configuration w/o cache, rejecting client',
        before: () => cache.isValid.mockReturnValue(false),
        endpoint: {
          key: 'testApi',
          config: { proxyBasePath: 'test-path' },
          client: rejectingGetClient,
        },
        after: result => _expectOutputToMatchSituation(result, false, 'testApi: ERROR'),
      })
      setupList.push({
        description: 'failing configuration w/o cache, missing path',
        before: () => cache.isValid.mockReturnValue(false),
        endpoint: {
          key: 'testApi',
          config: { proxyBasePath: null },
          client: rejectingGetClient,
        },
        after: result => _expectOutputToMatchSituation(result, false, 'testApi: ERROR'),
      })
      setupList.push({
        description: 'failing configuration w/o cache, missing path config',
        before: () => cache.isValid.mockReturnValue(false),
        endpoint: {
          key: 'testApi',
          config: null,
          client: rejectingGetClient,
        },
        after: result => _expectOutputToMatchSituation(result, false, 'testApi: ERROR'),
      })
      setupList.push({
        description: 'failing configuration w/o cache, missing endpoint config',
        before: () => cache.isValid.mockReturnValue(false),
        endpoint: null,
        after(result) {
          expect(result.text).toMatch('APPLICATION_STATUS: ERROR')
          expect(result.text).toMatch("Cannot read property 'key' of null")
        },
      })
      return setupList

    case 'kth-node-ldap':
      setupList.push({
        description: 'normal configuration',
        ldap: {
          isOk: true,
        },
        after: result => _expectOutputToMatchSituation(result, true, 'ldap: OK'),
      })
      setupList.push({
        description: 'testSearch configuration',
        options: { testSearch: true },
        ldap: { testSearch: jest.fn().mockResolvedValue({ isOk: true }) },
        after: result => _expectOutputToMatchSituation(result, true, 'ldap: OK'),
      })
      setupList.push({
        description: 'failing testSearch configuration, rejecting method',
        options: { testSearch: true },
        ldap: { testSearch: jest.fn().mockRejectedValue(testError) },
        after: result => _expectOutputToMatchSituation(result, false, 'ldap: Error'),
      })
      setupList.push({
        description: 'testSearch configuration, method w/o result',
        options: { testSearch: true },
        ldap: { testSearch: jest.fn().mockResolvedValue(null) },
        after: result => _expectOutputToMatchSituation(result, false, 'ldap: Error'),
      })
      return setupList

    case 'kth-node-mongo-db':
      setupList.push({
        description: 'system up',
        db: { isOk: () => true },
        after: result => _expectOutputToMatchSituation(result, true, 'mongodb: OK'),
      })
      setupList.push({
        description: 'system down',
        db: { isOk: () => false },
        after: result => _expectOutputToMatchSituation(result, false, 'mongodb: Error'),
      })
      return setupList

    case 'kth-node-redis':
      setupList.push({
        description: 'normal configuration',
        redis: jest.fn().mockResolvedValue({
          ping: jest.fn().mockImplementation(callback => {
            callback()
          }),
          quit: jest.fn(),
        }),
        redisOptions: {},
        after: result => _expectOutputToMatchSituation(result, true, 'redis: OK'),
      })
      setupList.push({
        description: 'rejecting method',
        redis: jest.fn().mockRejectedValue(testError),
        redisOptions: {},
        after: result => _expectOutputToMatchSituation(result, false, 'redis: Error'),
      })
      return setupList

    case 'kth-node-sql-db':
      setupList.push({
        description: 'normal configuration',
        db: {
          connect: jest.fn().mockResolvedValue(),
        },
        after: result => _expectOutputToMatchSituation(result, true, 'sqldb: OK'),
      })
      setupList.push({
        description: 'rejecting method',
        db: { connect: jest.fn().mockRejectedValue(testError) },
        after: result => _expectOutputToMatchSituation(result, false, 'sqldb: Error'),
      })
      return setupList

    case 'kth-node-agenda':
      setupList.push({
        description: 'system up',
        agendaState: true,
        after: result => _expectOutputToMatchSituation(result, true, 'agenda: OK'),
      })
      setupList.push({
        description: 'system down',
        agendaState: false,
        after: result => _expectOutputToMatchSituation(result, false, 'agenda: Error'),
      })
      return setupList

    default:
      return null
  }
}
