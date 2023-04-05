const log = require('@kth/log')
log.init()

import type { MonitoredSystem, ProbeType, SystemCheckResult } from './types'

export const filterSystems = (probeType: ProbeType, systems: MonitoredSystem[] = []): MonitoredSystem[] => {
  if (probeType === 'full') {
    return systems
  }

  if (probeType === 'readyness') {
    return systems.filter(system => ['redis', 'mongodb', 'sqldb'].includes(system.key))
  }

  return []
}

export const checkSystems = async (systems: MonitoredSystem[]): Promise<MonitoredSystem[]> => {
  const results = Promise.all(systems.map(checkSystem))
  return results
}

const checkSystem = async (system: MonitoredSystem): Promise<MonitoredSystem> => {
  const result = { ...system }

  if (isMongodbSystem(system)) {
    result.result = await checkMongodbSystem(system)
  } else {
    log.warn('Unknown system', system)
  }
  return result
}

const isMongodbSystem = (system: MonitoredSystem): boolean => (system.key === 'mongodb' ? true : false)

const checkMongodbSystem = async (system: MonitoredSystem): Promise<SystemCheckResult> => {
  const checkedSystem = { ...system }

  if (typeof checkedSystem.db?.isOk != 'function') {
    return { status: false, message: 'invalid configuration' }
  }

  if (await checkedSystem.db?.isOk()) {
    return { status: true }
  }

  return { status: false }
}
