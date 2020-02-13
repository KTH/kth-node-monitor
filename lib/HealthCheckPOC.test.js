'use strict'

console.log = jest.fn()
const log = require('kth-node-log')

const { hostname } = require('os')

const { HealthCheck } = require('./index')

const httpResponse = require('./httpResponse')

jest.mock('kth-node-log')
log.info = jest.fn()
log.error = jest.fn()
log.init = jest.fn()

describe('Class HealthCheck', () => {
  const types = HealthCheck.getTypesEnum()
  const typeNames = Object.values(types)

  it(`All ${typeNames.length} types of checks can be included.`, () => {
    const systemStatus = new HealthCheck()

    typeNames.forEach(name => {
      systemStatus.includeSubSystem(name, {})
    })
  })
})

describe('Class HealthCheck - when setting local status -', () => {
  it('The monitor response writes APPLICATION_STATUS: OK when local systems are working', async () => {
    const systemStatus = new HealthCheck()
    systemStatus.setLocalSystemStatus({ statusCode: httpResponse.statusCodes.OK, message: 'OK' })

    await systemStatus.queryAllStatuses()
    const response = systemStatus.getStatusText()

    expect(response.split('\n')[0].indexOf('APPLICATION_STATUS: OK')).not.toEqual(-1)
  })

  it('The monitor response writes APPLICATION_STATUS: ERROR when one of the local systems are in faild state.', async () => {
    const systemStatus = new HealthCheck()

    systemStatus.setLocalSystemStatus({
      statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
      message: 'ERROR'
    })

    await systemStatus.queryAllStatuses()
    const response = systemStatus.getStatusText()

    expect(response.split('\n')[0].indexOf('APPLICATION_STATUS: ERROR')).not.toEqual(-1)
  })

  it('The monitor response contains the local systems status message.', async () => {
    const systemStatus = new HealthCheck()

    systemStatus.setLocalSystemStatus({
      statusCode: httpResponse.statusCodes.OK,
      message: 'A status message'
    })

    await systemStatus.queryAllStatuses()
    const response = systemStatus.getStatusText()

    expect(response).toMatch('A status message')
  })

  it('The monitor response contains host name.', async () => {
    const systemStatus = new HealthCheck()

    systemStatus.setLocalSystemStatus({ statusCode: 200, message: 'Ok' })

    await systemStatus.queryAllStatuses()
    const response = systemStatus.getStatusText()

    expect(response).toMatch(`Hostname: ${hostname()}`)
  })
})
