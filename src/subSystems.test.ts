jest.mock('@kth/log')
const log = require('@kth/log')

import { filterSystems, checkSystems } from './subSystems'
import type { MonitoredSystem, ProbeType } from './types'

describe('select systems to include', () => {
  const systemList = [
    { key: 'agenda' },
    { key: 'mongodb' },
    { key: 'redis' },
    { key: 'sqldb' },
    { key: 'local' },
    { key: 'custom' },
    { key: 'anyName' },
  ] as MonitoredSystem[]
  it('do not select any systems on when probe=liveness', async () => {
    const results = filterSystems('liveness', systemList)
    expect(results).toEqual([])
  })
  it('select some systems when probe=readyness', async () => {
    const results = filterSystems('readyness', systemList)
    expect(results).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'mongodb' }),
        expect.objectContaining({ key: 'redis' }),
        expect.objectContaining({ key: 'sqldb' }),
        expect.objectContaining({ key: 'custom' }),
      ])
    )
    expect(results.length).toBe(4)
  })
  it('select all systems when probe=full', async () => {
    const results = filterSystems('full', systemList)
    expect(results).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'agenda' }),
        expect.objectContaining({ key: 'mongodb' }),
        expect.objectContaining({ key: 'redis' }),
        expect.objectContaining({ key: 'sqldb' }),
        expect.objectContaining({ key: 'local' }),
        expect.objectContaining({ key: 'custom' }),
        expect.objectContaining({ key: 'anyName' }),
      ])
    )
    expect(results.length).toBe(systemList.length)
  })
})

describe('check systems', () => {
  describe('custom systems', () => {
    const customSystem = { key: 'custom', name: 'customSystem' } as MonitoredSystem

    it('when "customCheck" exists, creates a successful result when "isOk" is true', async () => {
      const okSystem = {
        ...customSystem,
        customCheck: {
          isOk: true,
          message: 'Some custom message',
        },
      }

      const checkedSystems = await checkSystems([okSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(true)
      expect(checkedSystems[0].result?.message).toEqual('Some custom message')
    })

    it('when "customCheck" exists, creates an unsuccessful result when "isOk" is false', async () => {
      const notOkSystem: MonitoredSystem = {
        ...customSystem,
        customCheck: {
          isOk: false,
          message: 'Some error from custom subSystem',
        },
      }
      const checkedSystems = await checkSystems([notOkSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('Some error from custom subSystem')
    })

    it('when "customCheck" exists, creates an unsuccessful result if property isOk is missing', async () => {
      const invalidSystem: MonitoredSystem = {
        ...customSystem,
        // @ts-ignore   (needed since the required property isOk is missing)
        customCheck: {},
      }
      const checkedSystems = await checkSystems([invalidSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toContain(
        'invalid configuration: custom system missing required property "isOk"'
      )
    })

    it('when "customCheck" exists, creates an unsuccessful result if property isOk is not a boolean', async () => {
      const invalidSystem: MonitoredSystem = {
        ...customSystem,
        // @ts-ignore   (needed since we pass a string where a boolean is expected)
        customCheck: { isOk: 'notBoolean' },
      }
      const checkedSystems = await checkSystems([invalidSystem])
      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toContain(
        'invalid configuration: custom system missing required property "isOk"'
      )
    })

    it('when "customLookup" exists, creates a successful result when "lookupFn" resolves to true', async () => {
      const okSystem = {
        ...customSystem,
        customLookup: {
          lookupFn: async () => true,
        },
      }

      const checkedSystems = await checkSystems([okSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(true)
    })
    it('when "customLookup" exists, creates a unsuccessful result when "lookupFn" resolves to false', async () => {
      const notOkSystem = {
        ...customSystem,
        customLookup: {
          lookupFn: async () => false,
        },
      }

      const checkedSystems = await checkSystems([notOkSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(false)
    })
    it('when "customLookup" exists, creates a unsuccessful result when "lookupFn" rejects', async () => {
      const notOkSystem = {
        ...customSystem,
        customLookup: {
          lookupFn: async () => {
            throw new Error('The lookup failed')
          },
        },
      }

      const checkedSystems = await checkSystems([notOkSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('Error: The lookup failed')
    })
    it('when "customLookup" exists, creates a unsuccessful result when "lookupFn" resolves to other than boolean', async () => {
      const notOkSystem = {
        ...customSystem,
        customLookup: {
          lookupFn: async () => {
            return 'notBoolean'
          },
        },
      }

      // @ts-ignore   (needed since we return a string where a boolean is expected)
      const checkedSystems = await checkSystems([notOkSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('Error: invalid configuration')
    })
    it('when both "customCheck" and "customLookup" is missing, creates a unsuccessful result', async () => {
      const notOkSystem = {
        ...customSystem,
      }

      const checkedSystems = await checkSystems([notOkSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual(
        'Error: invalid configuration: custom system missing required property "customCheck" or "customLookup"'
      )
    })
    it('when both "customCheck" and "customLookup" exists, use result from "customCheck"', async () => {
      const okSystem = {
        ...customSystem,
        customLookup: {
          lookupFn: jest.fn().mockResolvedValue(false),
        },
        customCheck: {
          isOk: true,
        },
      }

      const checkedSystems = await checkSystems([okSystem])

      expect(checkedSystems[0].name).toEqual('customSystem')
      expect(checkedSystems[0].result?.status).toEqual(true)
      expect(okSystem.customLookup.lookupFn).not.toHaveBeenCalled()
    })
  })

  describe('unknown systems', () => {
    const unknownSystem = { key: 'unknownType', unknownField: {} } as unknown as MonitoredSystem
    it('returns no "result" field when a system is unknown', async () => {
      const checkedSystems = await checkSystems([unknownSystem])

      expect(checkedSystems[0].key).toEqual('unknownType')
      expect(checkedSystems[0].result).toEqual(undefined)
    })
    it('sets "ingored" field when a system is unknown', async () => {
      const checkedSystems = await checkSystems([unknownSystem])

      expect(checkedSystems[0].ignored).toEqual(true)
    })
    it('logs a warning when a system is unknown', async () => {
      const checkedSystems = await checkSystems([unknownSystem])

      expect(log.warn).toHaveBeenCalled()
    })
  })
  describe('mongodb', () => {
    let mongoSystem: MonitoredSystem
    beforeEach(() => {
      mongoSystem = { key: 'mongodb', db: { isOk: jest.fn() } } as MonitoredSystem
    })
    it('checks mongodb when key is "mongodb"', async () => {
      const checkedSystems = await checkSystems([mongoSystem])

      expect(mongoSystem.db.isOk).toHaveBeenCalled()
      expect(log.warn).not.toHaveBeenCalled()
    })
    it('creates successful result when "db.isOk" responds true', async () => {
      mongoSystem.db.isOk.mockResolvedValue(true)

      const checkedSystems = await checkSystems([mongoSystem])

      expect(checkedSystems[0].result?.status).toEqual(true)
    })
    it('creates unsuccessful result when "db.isOk" responds false', async () => {
      mongoSystem.db.isOk.mockResolvedValue(false)

      const checkedSystems = await checkSystems([mongoSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
    })
    it('creates unsuccessful result when "db.isOk" responds with non boolean', async () => {
      mongoSystem.db.isOk.mockResolvedValue('not_a_bool')

      const checkedSystems = await checkSystems([mongoSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
    })
    it('creates unsuccessful result when "db.isOk" is not a valid function', async () => {
      const invalidMongoSystem = { ...mongoSystem, db: { isOk: undefined } }

      const checkedSystems = await checkSystems([invalidMongoSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('invalid configuration')
    })
  })
  describe('redis', () => {
    const redisClient = { ping: jest.fn() }
    let redisSystem: MonitoredSystem
    beforeEach(() => {
      redisSystem = { key: 'redis', redis: jest.fn(), options: { host: 'redis://testredis' } } as MonitoredSystem
      redisSystem.redis.mockResolvedValue(redisClient)
    })
    it('checks redis when key is "redis"', async () => {
      const checkedSystems = await checkSystems([redisSystem])

      expect(redisSystem.redis).toHaveBeenCalledWith('HealthCheck', redisSystem.options)
      expect(log.warn).not.toHaveBeenCalled()
    })
    it('creates successful result when "client.ping" responds true', async () => {
      redisClient.ping.mockResolvedValue(true)

      const checkedSystems = await checkSystems([redisSystem])

      expect(checkedSystems[0].result?.status).toEqual(true)
    })
    it('creates unsuccessful result when "client.ping" responds false', async () => {
      redisClient.ping.mockResolvedValue(false)

      const checkedSystems = await checkSystems([redisSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
    })
    it('creates unsuccessful result when "redis" is not a function', async () => {
      redisSystem.redis = 'not_a_function'

      const checkedSystems = await checkSystems([redisSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('invalid configuration')
    })
    it('creates unsuccessful result when "options" are missing', async () => {
      delete redisSystem.options

      const checkedSystems = await checkSystems([redisSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('invalid configuration')
    })
    it('creates unsuccessful result when redis client throws error', async () => {
      const error = new Error('some_redis_error')
      redisClient.ping.mockRejectedValue(error)

      const checkedSystems = await checkSystems([redisSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual(expect.stringContaining(error.message))
      expect(log.error).toHaveBeenCalledWith(expect.any(String), error)
    })
  })
  describe('kth rest api', () => {
    let restSystem: MonitoredSystem
    beforeEach(() => {
      restSystem = {
        key: 'other-system',
        endpoint: { client: { getAsync: jest.fn() }, config: { proxyBasePath: 'rest-api-path' } },
      } as MonitoredSystem
      restSystem.endpoint.client.getAsync.mockResolvedValue({ statusCode: 200 })
    })
    it('checks rest api when "endpoint" exists on system', async () => {
      const checkedSystems = await checkSystems([restSystem])

      expect(restSystem.endpoint.client.getAsync).toHaveBeenCalledWith({ uri: 'rest-api-path/_monitor' })
      expect(log.warn).not.toHaveBeenCalled()
    })
    it('creates successful result when system responds with statuscode 200', async () => {
      restSystem.endpoint.client.getAsync.mockResolvedValue({ statusCode: 200 })

      const checkedSystems = await checkSystems([restSystem])

      expect(checkedSystems[0].result?.status).toEqual(true)
    })
    it('creates successful result when system responds with statuscode ~2xx', async () => {
      const code = 200 + Math.floor(Math.random() * 100)
      restSystem.endpoint.client.getAsync.mockResolvedValue({ statusCode: code })

      const checkedSystems = await checkSystems([restSystem])

      expect(checkedSystems[0].result?.status).toEqual(true)
    })
    it('creates unsuccessful result when system responds with statuscode >= 300', async () => {
      const code = 300 + Math.floor(Math.random() * 300)
      restSystem.endpoint.client.getAsync.mockResolvedValue({ statusCode: code })

      const checkedSystems = await checkSystems([restSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual(expect.stringContaining(code.toString()))
    })
    it('creates unsuccessful result when "getAsync" is not a function', async () => {
      restSystem.endpoint.client.getAsync = 'not_a_function'

      const checkedSystems = await checkSystems([restSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('invalid configuration')
    })
    it('creates unsuccessful result when "config" is missing', async () => {
      restSystem.endpoint.config = undefined

      const checkedSystems = await checkSystems([restSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('invalid configuration')
    })
    it('creates unsuccessful result when "config.proxyBasePath" is missing', async () => {
      restSystem.endpoint.config = {}

      const checkedSystems = await checkSystems([restSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('invalid configuration')
    })
    it('creates unsuccessful result when "getAsync" throws error', async () => {
      const error = new Error('some_http_error')
      restSystem.endpoint.client.getAsync.mockRejectedValue(error)

      const checkedSystems = await checkSystems([restSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual(expect.stringContaining(error.message))
      expect(log.error).toHaveBeenCalledWith(expect.any(String), error)
    })
  })
  describe('sqldb', () => {
    let sqldbSystem: MonitoredSystem
    beforeEach(() => {
      sqldbSystem = { key: 'sqldb', db: { connect: jest.fn() } } as MonitoredSystem
    })
    it('checks sqldb when key is "sqldb"', async () => {
      const checkedSystems = await checkSystems([sqldbSystem])

      expect(sqldbSystem.db.connect).toHaveBeenCalled()
      expect(log.warn).not.toHaveBeenCalled()
    })
    it('creates successful result when "db.connect" resolves', async () => {
      sqldbSystem.db.connect.mockResolvedValue()

      const checkedSystems = await checkSystems([sqldbSystem])

      expect(checkedSystems[0].result?.status).toEqual(true)
    })
    it('creates unsuccessful result when "db.connect" rejects', async () => {
      sqldbSystem.db.connect.mockRejectedValue()

      const checkedSystems = await checkSystems([sqldbSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
    })
    it('creates a message when "db.connect" rejects', async () => {
      const error = new Error('Sql error')
      sqldbSystem.db.connect.mockRejectedValue(error)

      const checkedSystems = await checkSystems([sqldbSystem])

      expect(checkedSystems[0].result?.message).toEqual(expect.stringContaining(error.message))
    })
    it('creates unsuccessful result when "db.connect" is not a valid function', async () => {
      const invalidsqldbSystem = { ...sqldbSystem, db: { connect: undefined } }

      const checkedSystems = await checkSystems([invalidsqldbSystem])

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('invalid configuration')
    })
  })
  describe('timeouts', () => {
    let sqldbSystem: MonitoredSystem
    beforeEach(() => {
      jest.useFakeTimers()
      sqldbSystem = { key: 'sqldb', db: { connect: jest.fn() } } as MonitoredSystem
    })
    afterEach(() => {
      jest.useRealTimers()
    })
    it('should success if check takes less than 5000 ms', async () => {
      sqldbSystem.db.connect.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 4000))
      })

      const checkPromise = checkSystems([sqldbSystem])
      jest.advanceTimersToNextTimer()
      const checkedSystems = await checkPromise

      expect(checkedSystems[0].result?.status).toEqual(true)
    })
    it('should timeout if check takes more than 5000 ms', async () => {
      sqldbSystem.db.connect.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 6000))
      })

      const checkPromise = checkSystems([sqldbSystem])
      jest.advanceTimersToNextTimer()
      const checkedSystems = await checkPromise

      expect(checkedSystems[0].result?.status).toEqual(false)
      expect(checkedSystems[0].result?.message).toEqual('system timed out')
    })
  })
})
