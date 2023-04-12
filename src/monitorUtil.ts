import type { Request, Response } from 'express'
import type { MonitoredSystem, ProbeType, MonitorResult } from './types'
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

  const systemResults = await checkSystems(systemsToCheck)

  const status: MonitorResult = checksAreOk(systemResults) ? 'OK' : 'ERROR'

  res.status(checksAreOk(systemResults) ? 200 : 503)

  if (req?.headers?.accept === 'application/json') {
    res.json(makeJsonResponse(status, systemResults))
  } else {
    res.type('text').send(makePlainResponse(status, systemResults))
  }
}

const makeJsonResponse = (result: MonitorResult, systemResults: MonitoredSystem[]) => ({
  message: result,
  subSystems: systemResults.map(system => {
    const { key, result, ignored, required } = system
    return { key, result, ignored, required }
  }),
})

const makePlainResponse = (result: MonitorResult, systemResults: MonitoredSystem[]) => {
  const header = `APPLICATION_STATUS: ${result}`

  const subSystems = systemResults.map(system => {
    const systemMessage = makePlainSystemMessage(system)
    return `${system.key} - ${systemMessage}`
  })

  return [header, ...subSystems].join('\n')
}

const makePlainSystemMessage = (system: MonitoredSystem) => {
  if (system.ignored) {
    return 'Ignored'
  }
  if (system.result?.status === true) {
    return 'OK'
  }
  if (system.result?.status === false && system.result?.message) {
    return `ERROR, ${system.result.message}`
  }
  if (system.result?.status === false) {
    return 'ERROR'
  }
  return 'UNKNOWN'
}

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
