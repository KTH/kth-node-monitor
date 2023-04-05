import { filterSystems } from './subSystems'
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
