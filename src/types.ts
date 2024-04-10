export interface SystemCheckResult {
  status: boolean
  responseTime?: number
  message?: string
}

export interface CustomCheckParameters {
  isOk: boolean
  message?: string
}
export interface CustomLookupParameters {
  lookupFn: () => Promise<boolean>
}

export type MonitoredSystem = {
  key: string
  name?: string
  customCheck?: CustomCheckParameters
  customLookup?: CustomLookupParameters
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
