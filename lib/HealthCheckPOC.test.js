/* eslint-disable no-use-before-define */

'use strict'

// eslint-disable-next-line import/newline-after-import
const os = require('os')
jest.mock('os')
os.hostname.mockReturnValue('test-host')

// eslint-disable-next-line import/newline-after-import
const httpResponse = require('./httpResponse')
httpResponse.getRequestTimeMs = jest.fn().mockReturnValue(79)

const { getTestDataForIncludeMethod } = require('./HealthCheckPOC.test-data')
const { HealthCheck } = require('./index')

describe('Class HealthCheck', () => {
  runTestsAboutUsingLocalSystems()
  runTestsAboutSupportedSubSystems()
})

function runTestsAboutUsingLocalSystems() {
  describe('- in combination with local system status', () => {
    it('when local systems are working - creates a snapshot', async () => {
      const systemStatus = new HealthCheck()

      systemStatus.setLocalSystemStatus({ statusCode: httpResponse.statusCodes.OK, message: 'OK' })

      await systemStatus.queryAllStatuses()

      const result = {
        text: systemStatus.getStatusText(),
        code: systemStatus.getStatusCode(),
        data: systemStatus.getStatusObject()
      }

      expect(result.text).toMatch('APPLICATION_STATUS: OK')

      expect(result).toMatchSnapshot()
    })

    it('when local systems are in failed state - creates a snapshot', async () => {
      const systemStatus = new HealthCheck()

      systemStatus.setLocalSystemStatus({
        statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
        message: 'ERROR'
      })

      await systemStatus.queryAllStatuses()
      const result = {
        text: systemStatus.getStatusText(),
        code: systemStatus.getStatusCode(),
        data: systemStatus.getStatusObject()
      }

      expect(result.text).toMatch('APPLICATION_STATUS: ERROR')

      expect(result).toMatchSnapshot()
    })

    it('- outputs the hostname with monitor response', async () => {
      const systemStatus = new HealthCheck()

      systemStatus.setLocalSystemStatus({ statusCode: 200, message: 'Ok' })

      await systemStatus.queryAllStatuses()
      const response = systemStatus.getStatusText()

      expect(response).toMatch(`Hostname: ${os.hostname()}`)
    })

    it('- outputs the local systems status message with monitor response', async () => {
      const systemStatus = new HealthCheck()

      systemStatus.setLocalSystemStatus({
        statusCode: httpResponse.statusCodes.OK,
        message: 'A status message'
      })

      await systemStatus.queryAllStatuses()
      const response = systemStatus.getStatusText()

      expect(response).toMatch('A status message')
    })
  })
}

function runTestsAboutSupportedSubSystems() {
  const types = HealthCheck._listSupportedSystems()

  const setups = types
    .sort((lItem, rItem) => (lItem.name < rItem.name ? -1 : 1))
    .map(item => {
      const { name, includeSuffix: suffix } = item
      const data = getTestDataForIncludeMethod(name)
      const dataList = Array.isArray(data) ? data : [data]
      return [name, suffix, dataList]
    })

  describe.each(setups)('- in combination with sub-system "%s"', (name, suffix, dataList) => {
    testIncludingSubSystem({ suffix, dataList, mode: 'Optional' })
    testIncludingSubSystem({ suffix, dataList, mode: 'Required' })
    testUsingSubSystem({ suffix, dataList, mode: 'Optional' })
    testUsingSubSystem({ suffix, dataList, mode: 'Required' })
  })

  const includingSubSystemNames = ['kth-node-agenda', 'kth-node-redis', 'kth-node-sql-db']
  const setupsOfThreeSubSystems = setups.filter(item => includingSubSystemNames.includes(item[0]))

  describe(`- in combination with three sub-systems at the same time`, () => {
    const availableConfigurationsPerSubSystem = setupsOfThreeSubSystems.map(item =>
      item[2].map(data => [item[1], data])
    )

    availableConfigurationsPerSubSystem[0].forEach((item0, index0) => {
      availableConfigurationsPerSubSystem[1].forEach((item1, index1) => {
        availableConfigurationsPerSubSystem[2].forEach((item2, index2) => {
          const permutationText = `${index0 + 1}-${index1 + 1}-${index2 + 1}`
          testUsingCombinedSubSystems([item0, item1, item2], permutationText)
        })
      })
    })
  })
}

function testIncludingSubSystem({ suffix, dataList, mode }) {
  const lengthText = dataList.length > 1 ? ` in ${dataList.length} situations` : ''

  it(`when only including sub-system (mode "${mode}") - succeeds${lengthText}`, () => {
    dataList.forEach(dataItem => {
      const systemStatus = new HealthCheck()
      systemStatus[`include${mode}${suffix}`](dataItem)
    })
  })
}

function testUsingSubSystem({ suffix, dataList, mode }) {
  const preparedDataList =
    dataList.length > 1
      ? dataList.map((item, index) => [
          item.description ? ` (${item.description})` : ` (situation #${index + 1})`,
          item
        ])
      : dataList.map(item => [item.description ? ` (${item.description})` : ``, item])

  it.each(preparedDataList)(
    `when using mocked sub-system (mode "${mode}") - creates a snapshot%s`,
    async (description, dataItem) => {
      const systemStatus = new HealthCheck()
      systemStatus[`include${mode}${suffix}`](dataItem)

      if (typeof dataItem.before === 'function') {
        dataItem.before()
      }

      await systemStatus.queryAllStatuses()

      const result = {
        text: systemStatus.getStatusText(),
        code: systemStatus.getStatusCode(),
        data: systemStatus.getStatusObject(),
        mode
      }

      if (typeof dataItem.after === 'function') {
        dataItem.after(result)
      }

      expect(result).toMatchSnapshot()
    }
  )
}

function testUsingCombinedSubSystems(systemList, permutationText) {
  it(`- creates a snapshot (situations ${permutationText})`, async () => {
    const systemStatus = new HealthCheck()

    systemList.forEach((item, index) => {
      const [suffix, data] = item
      if (index === 0) {
        systemStatus[`includeOptional${suffix}`](data)
      } else {
        systemStatus[`includeRequired${suffix}`](data)
      }
    })

    await systemStatus.queryAllStatuses()

    const result = {
      text: systemStatus.getStatusText(),
      code: systemStatus.getStatusCode(),
      data: systemStatus.getStatusObject()
    }

    expect(result).toMatchSnapshot()
  })
}
