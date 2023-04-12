import type { Request, Response } from 'express'
import type { MonitoredSystem, ProbeType } from './types'
import { filterSystems, checkSystems } from './subSystems'

const getProbeType = (req: Request) => {
  const probeParam = Object.entries(req.query).find(findProbeParam)?.[1] as String

  const probeValue = (Array.isArray(probeParam) ? probeParam[0] : probeParam || '').toLowerCase()

  if (['liveness', 'readyness', 'full'].includes(probeValue)) {
    return probeValue as ProbeType
  }

  return 'liveness'
}

const findProbeParam = ([key, _]: [string, any]) => key.toLowerCase() === 'probe'

const checksAreOk = (systems: MonitoredSystem[]) =>
  systems.filter(system => system.ignored != true).every(system => system.result?.status === true)

export const monitorSystems = async (req: Request, res: Response, monitoredSystems: MonitoredSystem[] = []) => {
  const contentType = req.headers.accept

  const probeType = getProbeType(req)

  const systemsToCheck = filterSystems(probeType, monitoredSystems)

  const results = await checkSystems(systemsToCheck)

  if (checksAreOk(results)) {
    res.status(200)
    if (req?.headers?.accept === 'application/json') res.json({ message: 'OK', results })
    else res.type('text').send('APPLICATION_STATUS: OK' + '\n' + results.map(printMockresult).join('\n'))
  } else {
    res.status(503)
    if (req?.headers?.accept === 'application/json') res.json({ message: 'ERROR', results })
    else res.type('text').send('APPLICATION_STATUS: ERROR' + '\n' + results.map(printMockresult).join('\n'))
  }
}

const printMockresult = (system: MonitoredSystem) => `${system.key} - ${system.result?.status}`

module.exports = monitorSystems
module.exports.monitorSystems = monitorSystems
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
