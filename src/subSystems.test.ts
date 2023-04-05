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
      ])
    )
    expect(results.length).toBe(3)
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
        expect.objectContaining({ key: 'anyName' }),
      ])
    )
    expect(results.length).toBe(systemList.length)
  })
})

describe('check systems', () => {
  describe('unknown systems', () => {
    const unknownSystem = { key: 'unknownType', unknownField: {} } as unknown as MonitoredSystem
    it('returns no "result" field when a system is unknown', async () => {
      const checkedSystems = await checkSystems([unknownSystem])

      expect(checkedSystems[0].key).toEqual('unknownType')
      expect(checkedSystems[0].result).toEqual(undefined)
    })
    it('logs a warning when a system is unknown', async () => {
      const checkedSystems = await checkSystems([unknownSystem])

      expect(log.warn).toHaveBeenCalled()
    })
  })
  describe('mongodb', () => {
    const mongoSystem = { key: 'mongodb', db: { isOk: jest.fn() } } as MonitoredSystem
    it('detects mongodb when key is "mongodb"', async () => {
      const checkedSystems = await checkSystems([mongoSystem])

      expect(mongoSystem.db.isOk).toHaveBeenCalled()
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
  })
})
