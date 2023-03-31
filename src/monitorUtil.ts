import type { Request, Response } from 'express'

const monitorSystems = async (req: Request, res: Response, monitoredSystems: [any]): Promise<void> => {
  const contentType = req.headers.accept

  if (req?.headers?.accept === 'application/json') res.json({ message: 'OK' })
  else res.type('text').send('APPLICATION_STATUS: OK')
}

module.exports = monitorSystems
