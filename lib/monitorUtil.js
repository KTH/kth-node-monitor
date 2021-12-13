const os = require('os')
const log = require('kth-node-log')
const { getLdapStatus, getMongoDbStatus, getApiStatus, getRedisStatus, getSqlDbStatus, getAgendaStatus } = require('./getStatus')

const _getAppStatus = systems =>
  systems
    .filter(system => system.required)
    .some(system => !system.isResolved || !system.message || system.message.match(/(ERROR|TIMEOUT|DOWN)/))
    ? 503
    : 200

function _getResponseTime(msg) {
  try {
    const responseTime = msg.match(/Response time: [0-9].*ms/)

    if (responseTime && responseTime.length > 0) {
      return parseInt(
        responseTime[0]
          .replace(/Response time:/, '')
          .trim()
          .replace(/ms$/, ''),
        10
      )
    }
  } catch (e) {
    return undefined
  }
  return undefined
}

async function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis))
}

function renderStatusText(systems) {
  let rval = _getAppStatus(systems) === 200 ? 'APPLICATION_STATUS: OK' : 'APPLICATION_STATUS: ERROR'
  const subSystems = systems.filter(system => system.key !== 'local')
  const localSystems = systems.filter(system => system.key === 'local')

  rval += '\n\n' + subSystems.map(system => `${system.message || `- ${system.key}: TIMEOUT | Required to work: ${!!system.required}`}`).join('\n')
  rval += '\n\n' + localSystems.map(system => `${system.message || `- ${system.key}: TIMEOUT | Required to work: ${!!system.required}`}`).join('\n')
  rval += `\n\nHostname: ${os.hostname()}`

  log.debug(`${rval}`)
  return rval
}

function renderStatusJson(systems) {
  const statusCode = _getAppStatus(systems)
  const subSystems = {}
  systems
    .filter(system => system.key !== 'local' && system.isResolved)
    .map(system => {
      subSystems[system.key] = {
        key: system.key,
        statusCode: system.statusCode,
        required: system.required,
        message: system.message,
        responseTime: _getResponseTime(system.message),
      }
      return system
    })

  const localSystems = {}
  systems
    .filter(system => system.key === 'local' && system.isResolved)
    .map(system => {
      localSystems.statusCode = system.statusCode
      localSystems.message = system.message
      return system
    })
  return {
    statusCode,
    message: statusCode === 200 ? 'OK' : 'ERROR',
    subSystems,
    localSystems,
  }
}

function waitForStatus(system) {
  return Promise.any([
    (async () => {
      await sleep(7000)
      return {...system, statusCode: 503, message: `- ${system.key}: TIMEOUT | Required to work: ${!!system.required}`}
    })(),
    (async () => {
      if(system.isResolved) return system
      let data
      const statusOptions = {name: system.key, required: system.required}
      if(system.key === 'ldap') data = await getLdapStatus({ldap: system.ldap, options: system.options}, statusOptions)
      else if(system.key === 'mongodb') data = await getMongoDbStatus({db: system.db}, statusOptions)
      else if(system.key === 'redis') data = await getRedisStatus({redis: system.redis, redisOptions: system.options}, statusOptions)
      else if(system.key === 'sqldb') data = await getSqlDbStatus({db: system.db}, statusOptions)
      else if(system.key === 'agenda') data = await getAgendaStatus({agendaState: system.agendaState}, statusOptions)
      else data = await getApiStatus({endpoint: system.endpoint}, statusOptions)
      system.isResolved = true
      return {...system, statusCode: data ? 200 : 500, message: data?.message || 'ERROR'}
    })()
  ])
  
}

async function monitorSystems(req, res, monitoredSystems) {
  const response = await Promise.any([
    Promise.allSettled(monitoredSystems.map(system => {
      if(system.isResolved) return system
      if(typeof system.getStatus === 'function') return system.getStatus(system)
      return waitForStatus(system)
    })),
    (async () => await sleep(8000))(),
  ])
  if(Array.isArray(response)) {
    const data = response.map(({value, reason}) => value || reason)
    res.status(_getAppStatus(monitoredSystems))  
    if(req.headers.accept === 'application/json') res.json(renderStatusJson(data))
    else res.type('text').send(renderStatusText(data))
    return
  }
  res.status(503)  
  if(req.headers.accept === 'application/json') res.json(renderStatusJson(monitoredSystems))
  else res.type('text').send(renderStatusText(monitoredSystems))
}

module.exports = monitorSystems
