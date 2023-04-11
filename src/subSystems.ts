const log = require('@kth/log')
log.init()

import type { MonitoredSystem, ProbeType, SystemCheckResult } from './types'

const SYSTEM_CHECK_TIMEOUT = 5000

export const filterSystems = (probeType: ProbeType, systems: MonitoredSystem[] = []): MonitoredSystem[] => {
  if (probeType === 'full') {
    return systems
  }

  if (probeType === 'readyness') {
    return systems.filter(system => ['redis', 'mongodb', 'sqldb'].includes(system.key))
  }

  return []
}

export const checkSystems = async (systems: MonitoredSystem[]): Promise<MonitoredSystem[]> =>
  Promise.all(systems.map(timeoutWrapper(checkSystem)))

const timeoutWrapper =
  (checkSystem: (system: MonitoredSystem) => Promise<MonitoredSystem>) => (system: MonitoredSystem) =>
    Promise.any([
      // Retur successfull result or timeout, depenting on what resolves fastest
      checkSystem(system),
      timeoutSystem(system),
    ])

const timeoutSystem = async (system: MonitoredSystem): Promise<MonitoredSystem> => {
  const result = { ...system }

  await sleep(SYSTEM_CHECK_TIMEOUT)

  result.result = { status: false, message: 'system timed out' }

  return result
}

const checkSystem = async (system: MonitoredSystem): Promise<MonitoredSystem> => {
  const result = { ...system }

  if (isMongodbSystem(system)) {
    result.result = await checkMongodbSystem(system)
  } else if (isRedisSystem(system)) {
    result.result = await checkRedisSystem(system)
  } else if (isKthApiSystem(system)) {
    result.result = await checkKthApiSystem(system)
  } else if (isSqldbSystem(system)) {
    result.result = await checkSqldbSystem(system)
  } else {
    result.ignored = true
    log.warn('@kth/monitor - Unknown system', system)
  }
  return result
}

const isMongodbSystem = (system: MonitoredSystem): boolean => system.key === 'mongodb'
const isRedisSystem = (system: MonitoredSystem): boolean => system.key === 'redis'
const isKthApiSystem = (system: MonitoredSystem): boolean => system.endpoint != undefined
const isSqldbSystem = (system: MonitoredSystem): boolean => system.key === 'sqldb'

const checkMongodbSystem = async (system: MonitoredSystem): Promise<SystemCheckResult> => {
  if (typeof system.db?.isOk != 'function') {
    return { status: false, message: 'invalid configuration' }
  }

  if ((await system.db?.isOk()) === true) {
    return { status: true }
  }

  return { status: false }
}

const checkRedisSystem = async (system: MonitoredSystem): Promise<SystemCheckResult> => {
  const { redis, options } = system

  if (typeof system.redis != 'function' || !options) {
    return { status: false, message: 'invalid configuration' }
  }

  try {
    const client = await redis('HealthCheck', options)

    const pingStatus = await client.ping()

    if (pingStatus === true) {
      return { status: true }
    }
    return { status: false }
  } catch (error: any) {
    log.error('@kth/monitor - Redis check failed unexpected', error)
    return { status: false, message: (error || '').toString() }
  }
}

const checkKthApiSystem = async (system: MonitoredSystem): Promise<SystemCheckResult> => {
  const { endpoint } = system
  const baseUrl: string = endpoint.config?.proxyBasePath || ''

  if (typeof endpoint.client?.getAsync != 'function' || !baseUrl) {
    return { status: false, message: 'invalid configuration' }
  }

  try {
    const response = await endpoint.client.getAsync({ uri: `${baseUrl}/_monitor` })

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return { status: true }
    }
    return { status: false, message: `Responded with code ${response.statusCode}` }
  } catch (error: any) {
    log.error('@kth/monitor - Api check failed unexpected', error)
    return { status: false, message: (error || '').toString() }
  }
}

const checkSqldbSystem = async (system: MonitoredSystem): Promise<SystemCheckResult> => {
  const { db } = system

  if (typeof db.connect != 'function') {
    return { status: false, message: 'invalid configuration' }
  }

  try {
    await db.connect()
    return { status: true }
  } catch (error: any) {
    log.error('@kth/monitor - Sqldb check failed', error)
    return { status: false, message: (error || '').toString() }
  }
}

const sleep = async (delay: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delay)
    timer.unref()
  })
