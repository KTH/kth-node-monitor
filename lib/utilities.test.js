'use strict'

// eslint-disable-next-line no-console
console.log = jest.fn()
const log = require('kth-node-log')

const { hostname } = require('os')

const registry = require('component-registry').globalRegistry
const { interfaces } = require('./index')
const httpResponse = require('./httpResponse')

jest.mock('kth-node-log')
log.info = jest.fn()
log.debug = jest.fn()
log.error = jest.fn()
log.init = jest.fn()

const getUtilityNames = () => {
  const values = []
  Object.keys(interfaces.names).forEach(name => {
    values.push(interfaces.names[name])
  })
  return values
}

describe('Utilities', () => {
  it(`All ${getUtilityNames().length} types of checks can be found.`, () => {
    getUtilityNames().forEach(name => {
      const util = registry.getUtility(interfaces.IHealthCheck, name)
      expect(util).not.toEqual(undefined)
    })
  })
})

describe('Utilities / Status check (kth-node-system-check).', () => {
  it('The monitor response writes APPLICATION_STATUS: OK when local systems are working', done => {
    const systemHealthUtil = registry.getUtility(interfaces.IHealthCheck, interfaces.names.KTH_NODE_SYSTEM_CHECK)
    const localSystems = Promise.resolve({
      statusCode: httpResponse.statusCodes.OK,
      message: 'OK',
    })

    systemHealthUtil.status(localSystems).then(status => {
      const response = systemHealthUtil.renderText(status)
      expect(response.split('\n')[0].indexOf('APPLICATION_STATUS: OK')).not.toEqual(-1)
      done()
    })
  })

  it('The monitor response writes APPLICATION_STATUS: ERROR when one of the local systems are in faild state.', done => {
    const systemHealthUtil = registry.getUtility(interfaces.IHealthCheck, interfaces.names.KTH_NODE_SYSTEM_CHECK)
    const localSystems = Promise.resolve({
      statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
      message: 'ERROR',
    })

    systemHealthUtil.status(localSystems).then(status => {
      const response = systemHealthUtil.renderText(status)
      expect(response.split('\n')[0].indexOf('APPLICATION_STATUS: ERROR')).not.toEqual(-1)
      done()
    })
  })

  it('The monitor response contains the local systems status message.', done => {
    const systemHealthUtil = registry.getUtility(interfaces.IHealthCheck, interfaces.names.KTH_NODE_SYSTEM_CHECK)
    const localSystems = Promise.resolve({
      statusCode: httpResponse.statusCodes.OK,
      message: 'A status message',
    })

    systemHealthUtil.status(localSystems).then(status => {
      const response = systemHealthUtil.renderText(status)
      expect(response).toContain('A status message')
      done()
    })
  })

  it('The monitor response contains host name.', done => {
    const systemHealthUtil = registry.getUtility(interfaces.IHealthCheck, interfaces.names.KTH_NODE_SYSTEM_CHECK)
    const localSystems = Promise.resolve({ statusCode: 200, message: 'Ok' })

    systemHealthUtil.status(localSystems).then(status => {
      const response = systemHealthUtil.renderText(status)
      expect(response.indexOf(`Hostname: ${hostname()}`)).not.toEqual(-1)
      done()
    })
  })
})
