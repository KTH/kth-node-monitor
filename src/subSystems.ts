import type { MonitoredSystem, ProbeType } from './types'

export const filterSystems = (probeType: ProbeType, systems: MonitoredSystem[] = []): MonitoredSystem[] => {
  if (probeType === 'full') {
    return systems
  }

  if (probeType === 'readyness') {
    return systems.filter(system => ['redis', 'mongodb', 'sqldb'].includes(system.key))
  }

  return []
}
