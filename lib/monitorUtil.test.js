'use strict'

const os = require('os')
const http = require('http')
const https = require('https')
const log = require('@kth/log')

log.init()

const mockGetLdapStatus = jest.fn(({ ldap, options }) => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(ldap).toEqual('ldap')
  // eslint-disable-next-line jest/no-standalone-expect
  expect(options).toEqual('ldapOptions')
  return { message: 'ldap: APPLICATION_STATUS: OK' }
})

const mockGetMongoDbStatus = jest.fn(({ db }) => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(db).toEqual('mongodb')
  return { message: 'mongodb: APPLICATION_STATUS: OK' }
})

const mockGetApiStatus = jest.fn(({ endpoint }) => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(endpoint).toEqual('endpoint')
  return { message: 'APPLICATION_STATUS: OK' }
})

const mockGetRedisStatus = jest.fn(({ redis, redisOptions }) => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(redis).toEqual('redis')
  // eslint-disable-next-line jest/no-standalone-expect
  expect(redisOptions).toEqual('redisOptions')
  return { message: 'redis: APPLICATION_STATUS: OK' }
})

const mockGetSqlDbStatus = jest.fn(({ db }) => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(db).toEqual('sqldb')
  return { message: 'sqldb: APPLICATION_STATUS: OK' }
})

const mockGetAgendaStatus = jest.fn(({ agendaState }) => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(agendaState).toEqual('agendaState')
  return { message: 'agenda: APPLICATION_STATUS: OK' }
})

const mockJSON = jest.fn(object => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(object).toMatchObject({
    localSystems: {},
    message: 'OK',
    statusCode: 200,
    subSystems: {
      agenda: {
        key: 'agenda',
        message: 'agenda: APPLICATION_STATUS: OK',
        required: undefined,
        responseTime: undefined,
        statusCode: 200,
      },
      ldap: {
        key: 'ldap',
        message: 'ldap: APPLICATION_STATUS: OK',
        required: undefined,
        responseTime: undefined,
        statusCode: 200,
      },
      'local index': {
        key: 'local index',
        required: true,
        statusCode: 200,
      },
      mongodb: {
        key: 'mongodb',
        message: 'mongodb: APPLICATION_STATUS: OK',
        required: undefined,
        responseTime: undefined,
        statusCode: 200,
      },
      redis: {
        key: 'redis',
        message: 'redis: APPLICATION_STATUS: OK',
        required: undefined,
        responseTime: undefined,
        statusCode: 200,
      },
      some_api: {
        key: 'some_api',
        message: 'APPLICATION_STATUS: OK',
        required: undefined,
        responseTime: undefined,
        statusCode: 200,
      },
      sqldb: {
        key: 'sqldb',
        message: 'sqldb: APPLICATION_STATUS: OK',
        required: undefined,
        responseTime: undefined,
        statusCode: 200,
      },
    },
  })
})

const mockStatus = jest.fn(status => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(status).toEqual(200)
})

const mockSend = jest.fn(text => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(text).toMatch(
    new RegExp(`APPLICATION_STATUS: OK

- local index: OK | Response time: \\d*ms | Required to work: true
ldap: APPLICATION_STATUS: OK
mongodb: APPLICATION_STATUS: OK
redis: APPLICATION_STATUS: OK
sqldb: APPLICATION_STATUS: OK
agenda: APPLICATION_STATUS: OK
APPLICATION_STATUS: OK



Hostname: ${os.hostname()}`)
  )
})

const mockType = jest.fn(type => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(type).toEqual('text')
  return { send: mockSend }
})

jest.mock('./getStatus', () => ({
  getLdapStatus: mockGetLdapStatus,
  getMongoDbStatus: mockGetMongoDbStatus,
  getApiStatus: mockGetApiStatus,
  getRedisStatus: mockGetRedisStatus,
  getSqlDbStatus: mockGetSqlDbStatus,
  getAgendaStatus: mockGetAgendaStatus,
}))

// jest.mock('http', () => ({ get: jest.fn(() => mockGet) }))
// jest.mock('https', () => ({ get: jest.fn(() => mockGet) }))
const monitorUtil = require('./monitorUtil')

describe('Monitor', () => {
  it('Produces a JSON monitor object', () => {
    http.get = https.get = (_, callback) => {
      const obj = {
        on: (event, timeoutCallback) => {
          if (event == 'end') setTimeout(timeoutCallback, 150)
          return obj
        },
        statusCode: 200,
      }
      callback(obj)
      return obj
    }

    const systems = [
      {
        key: 'ldap',
        ldap: 'ldap',
        options: 'ldapOptions',
      },
      {
        key: 'mongodb',
        db: 'mongodb',
      },
      {
        key: 'redis',
        redis: 'redis',
        options: 'redisOptions',
      },
      {
        key: 'sqldb',
        db: 'sqldb',
      },
      {
        key: 'agenda',
        agendaState: 'agendaState',
      },
      {
        key: 'some_api',
        endpoint: 'endpoint',
      },
    ]
    const req = {
      protocol: 'http',
      host: 'i.am.testing',
      socket: { localPort: 4040 },
      url: '/some/path/for/test/_monitor/',
      headers: { accept: 'application/json' },
    }
    const res = {
      json: mockJSON,
      status: mockStatus,
    }
    return monitorUtil(req, res, systems).then(() => {
      expect(mockGetLdapStatus).toHaveBeenCalled()
      expect(mockGetMongoDbStatus).toHaveBeenCalled()
      expect(mockGetApiStatus).toHaveBeenCalled()
      expect(mockGetRedisStatus).toHaveBeenCalled()
      expect(mockGetSqlDbStatus).toHaveBeenCalled()
      expect(mockGetAgendaStatus).toHaveBeenCalled()
      expect(mockJSON).toHaveBeenCalled()
      expect(mockStatus).toHaveBeenCalled()
    })
  })

  it('Produces a monitor page', () => {
    const systems = [
      {
        key: 'ldap',
        ldap: 'ldap',
        options: 'ldapOptions',
      },
      {
        key: 'mongodb',
        db: 'mongodb',
      },
      {
        key: 'redis',
        redis: 'redis',
        options: 'redisOptions',
      },
      {
        key: 'sqldb',
        db: 'sqldb',
      },
      {
        key: 'agenda',
        agendaState: 'agendaState',
      },
      {
        key: 'some_api',
        endpoint: 'endpoint',
      },
    ]
    const req = {
      protocol: 'https',
      host: 'i.am.testing',
      socket: { localPort: 4040 },
      url: '/some/path/for/test/_monitor',
    }
    const res = {
      type: mockType,
      status: mockStatus,
    }
    return monitorUtil(req, res, systems).then(() => {
      expect(mockGetLdapStatus).toHaveBeenCalled()
      expect(mockGetMongoDbStatus).toHaveBeenCalled()
      expect(mockGetApiStatus).toHaveBeenCalled()
      expect(mockGetRedisStatus).toHaveBeenCalled()
      expect(mockGetSqlDbStatus).toHaveBeenCalled()
      expect(mockGetAgendaStatus).toHaveBeenCalled()
      expect(mockType).toHaveBeenCalled()
      expect(mockSend).toHaveBeenCalled()
      expect(mockStatus).toHaveBeenCalled()
    })
  })
})
