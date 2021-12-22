'use strict'

const os = require('os')
const log = require('@kth/log')

log.init()

const mockGetLdapStatus = jest.fn(({ ldap, options }) => {
  expect(ldap).toEqual('ldap')
  expect(options).toEqual('ldapOptions')
  return { message: 'ldap: APPLICATION_STATUS: OK' }
})

const mockGetMongoDbStatus = jest.fn(({ db }) => {
  expect(db).toEqual('mongodb')
  return { message: 'mongodb: APPLICATION_STATUS: OK' }
})

const mockGetApiStatus = jest.fn(({ endpoint }) => {
  expect(endpoint).toEqual('endpoint')
  return { message: 'APPLICATION_STATUS: OK' }
})

const mockGetRedisStatus = jest.fn(({ redis, redisOptions }) => {
  expect(redis).toEqual('redis')
  expect(redisOptions).toEqual('redisOptions')
  return { message: 'redis: APPLICATION_STATUS: OK' }
})

const mockGetSqlDbStatus = jest.fn(({ db }) => {
  expect(db).toEqual('sqldb')
  return { message: 'sqldb: APPLICATION_STATUS: OK' }
})

const mockGetAgendaStatus = jest.fn(({ agendaState }) => {
  expect(agendaState).toEqual('agendaState')
  return { message: 'agenda: APPLICATION_STATUS: OK' }
})

const mockJSON = jest.fn(object => {
  expect(object).toEqual({
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
  expect(status).toEqual(200)
})

const mockSend = jest.fn(text => {
  expect(text).toEqual(`APPLICATION_STATUS: OK

ldap: APPLICATION_STATUS: OK
mongodb: APPLICATION_STATUS: OK
redis: APPLICATION_STATUS: OK
sqldb: APPLICATION_STATUS: OK
agenda: APPLICATION_STATUS: OK
APPLICATION_STATUS: OK



Hostname: ${os.hostname()}`)
})

const mockType = jest.fn(type => {
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

const monitorUtil = require('./monitorUtil')

describe('Monitor', () => {
  it('Produces a JSON monitor object', done => {
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
    const req = { headers: { accept: 'application/json' } }
    const res = {
      json: mockJSON,
      status: mockStatus,
    }
    monitorUtil(req, res, systems).then(() => {
      expect(mockGetLdapStatus).toHaveBeenCalled()
      expect(mockGetMongoDbStatus).toHaveBeenCalled()
      expect(mockGetApiStatus).toHaveBeenCalled()
      expect(mockGetRedisStatus).toHaveBeenCalled()
      expect(mockGetSqlDbStatus).toHaveBeenCalled()
      expect(mockGetAgendaStatus).toHaveBeenCalled()
      expect(mockJSON).toHaveBeenCalled()
      expect(mockStatus).toHaveBeenCalled()
      done()
    })
  })

  it('Produces a monitor page', done => {
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
    const req = { headers: { accept: 'application/text' } }
    const res = {
      type: mockType,
      status: mockStatus,
    }
    monitorUtil(req, res, systems).then(() => {
      expect(mockGetLdapStatus).toHaveBeenCalled()
      expect(mockGetMongoDbStatus).toHaveBeenCalled()
      expect(mockGetApiStatus).toHaveBeenCalled()
      expect(mockGetRedisStatus).toHaveBeenCalled()
      expect(mockGetSqlDbStatus).toHaveBeenCalled()
      expect(mockGetAgendaStatus).toHaveBeenCalled()
      expect(mockType).toHaveBeenCalled()
      expect(mockSend).toHaveBeenCalled()
      expect(mockStatus).toHaveBeenCalled()
      done()
    })
  })
})
