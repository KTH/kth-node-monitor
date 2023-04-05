import type { Request, Response } from 'express'
import type { MonitoredSystem, ProbeType } from './types'
import { filterSystems } from './subSystems'

const getProbeType = (req: Request): ProbeType => {
  const probeParam = Object.entries(req.query).find(findProbeParam)?.[1] as String

  const probeValue = (Array.isArray(probeParam) ? probeParam[0] : probeParam || '').toLowerCase()

  if (['liveness', 'readyness', 'full'].includes(probeValue)) {
    return probeValue as ProbeType
  }

  return 'liveness'
}

const findProbeParam = ([key, _]: [string, any]): boolean => key.toLowerCase() === 'probe'

export const monitorSystems = async (
  req: Request,
  res: Response,
  monitoredSystems: MonitoredSystem[] = []
): Promise<void> => {
  const contentType = req.headers.accept

  const probeType = getProbeType(req)

  const systemsToCheck = filterSystems(probeType, monitoredSystems)

  const results = mockCheckSystems(systemsToCheck)

  if (req?.headers?.accept === 'application/json') res.json({ message: 'OK', results })
  else res.type('text').send('APPLICATION_STATUS: OK' + '\n' + results.join('\n'))
}

const mockCheckSystems = (systems: MonitoredSystem[]): string[] => systems.map(system => `${system.key} - NOT CHECKED!`)

module.exports = monitorSystems
export default monitorSystems

const monitoredSystems = [
  { key: 'mongo', required: Boolean, db: 'kth mongo instance ??' },

  { key: 'agenda', required: Boolean, agendaState: Boolean }, // Keep this ?
  { key: 'ldap', required: Boolean, ldap: 'kth ldap instance ??' }, // keep this ?
  { key: 'redis', required: Boolean, redis: 'kth redis instance ??' },
  { key: 'sqldb', required: Boolean, db: 'database file in app repo' },
  { key: 'any', required: Boolean, getStatus: 'function. returns statusCode, isResolved, message' }, // Used in search-web
  { key: 'any', required: Boolean, isResolved: Boolean }, // Used for local in node-api
]
