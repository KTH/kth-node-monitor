import type { Request, Response } from 'express'

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

type MonitoredSystem = MongoSystem | IsResolvedSystem | RedisSystem | SqlSystem | CustomCheckSystem

export const monitorSystems = async (
  req: Request,
  res: Response,
  monitoredSystems?: MonitoredSystem[]
): Promise<void> => {
  const contentType = req.headers.accept

  if (req?.headers?.accept === 'application/json') res.json({ message: 'OK' })
  else res.type('text').send('APPLICATION_STATUS: OK')
}

module.exports = monitorSystems
export default monitorSystems
