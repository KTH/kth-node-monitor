export interface SystemCheckResult {
  status: boolean
  responseTime?: number
  message?: string
}

interface BasicSystem {
  key: string
  required?: boolean
  status?: boolean
  result?: SystemCheckResult
}

interface IsResolvedSystem extends BasicSystem {
  isResolved: boolean
  message: string
}

interface MongoSystem extends BasicSystem {
  db: any
}

interface RedisSystem extends BasicSystem {
  redis: any
}

interface SqlSystem extends BasicSystem {
  db: any
}

interface CustomCheckSystem extends BasicSystem {
  getStatus: Function
}

export type MonitoredSystem_ = MongoSystem | IsResolvedSystem | RedisSystem | SqlSystem | CustomCheckSystem

export type MonitoredSystem = {
  key: string
  required?: boolean
  db?: any
  redis?: any
  options?: any
  status?: boolean
  result?: SystemCheckResult
}

export type ProbeType = 'liveness' | 'readyness' | 'full'
