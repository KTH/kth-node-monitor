export interface SystemCheckResult {
  status: boolean
  responseTime?: number
  message?: string
}

export type MonitoredSystem = {
  key: string
  name?: string
  isOk?: boolean
  message?: string
  required?: boolean
  ignored?: boolean
  db?: any
  redis?: any
  options?: any
  endpoint?: any
  status?: boolean
  result?: SystemCheckResult
}

export type ProbeType = 'liveness' | 'readyness' | 'full'

export type MonitorResult = 'OK' | 'ERROR'
