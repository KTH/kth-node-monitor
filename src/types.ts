interface BasicSystem {
  key: string
  required?: boolean
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

export type MonitoredSystem = MongoSystem | IsResolvedSystem | RedisSystem | SqlSystem | CustomCheckSystem

export type ProbeType = 'liveness' | 'readyness' | 'full'
