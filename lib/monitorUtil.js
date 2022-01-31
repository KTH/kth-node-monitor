const os = require('os')
const log = require('@kth/log')
const protocols = {
  http: require('http'),
  https: require('https'),
}
const {
  getLdapStatus,
  getMongoDbStatus,
  getApiStatus,
  getRedisStatus,
  getSqlDbStatus,
  getAgendaStatus,
} = require('./getStatus')

const _getAppStatus = systems =>
  systems
    .filter(system => system.required)
    .some(system => !system.isResolved || !system.message || system.message.match(/(ERROR|TIMEOUT|DOWN)/i))
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
  return new Promise(resolve => {
    const timer = setTimeout(resolve, millis)
    timer.unref()
  })
}

function renderStatusText(systems) {
  let rval = _getAppStatus(systems) === 200 ? 'APPLICATION_STATUS: OK' : 'APPLICATION_STATUS: ERROR'
  const subSystems = systems.filter(system => system.key !== 'local')
  const localSystems = systems.filter(system => system.key === 'local')

  rval +=
    '\n\n' +
    subSystems
      .map(system => `${system.message || `- ${system.key}: TIMEOUT | Required to work: ${!!system.required}`}`)
      .join('\n')
  rval +=
    '\n\n' +
    localSystems
      .map(system => `${system.message || `- ${system.key}: TIMEOUT | Required to work: ${!!system.required}`}`)
      .join('\n')
  rval += `\n\nHostname: ${os.hostname()}`

  log.debug(`${rval}`)
  return rval
}

function renderStatusJson(systems) {
  const statusCode = _getAppStatus(systems)
  const subSystems = {}
  systems
    .filter(system => system.key !== 'local')
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
    .filter(system => system.key === 'local')
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
      return {
        ...system,
        statusCode: 503,
        message: `- ${system.key}: TIMEOUT | Required to work: ${!!system.required}`,
      }
    })(),
    (async () => {
      if (system.isResolved) return system
      if (typeof system.getStatus === 'function') return system.getStatus(system)
      let data
      const statusOptions = { name: system.key, required: system.required }
      if (system.key === 'ldap')
        data = await getLdapStatus({ ldap: system.ldap, options: system.options }, statusOptions)
      else if (system.key === 'mongodb') data = await getMongoDbStatus({ db: system.db }, statusOptions)
      else if (system.key === 'redis')
        data = await getRedisStatus({ redis: system.redis, redisOptions: system.options }, statusOptions)
      else if (system.key === 'sqldb') data = await getSqlDbStatus({ db: system.db }, statusOptions)
      else if (system.key === 'agenda') data = await getAgendaStatus({ agendaState: system.agendaState }, statusOptions)
      else data = await getApiStatus({ endpoint: system.endpoint }, statusOptions)
      system.isResolved = true
      return { ...system, statusCode: data ? 200 : 500, message: data?.message || 'ERROR' }
    })(),
  ])
}

function urlCheck(url) {
  const protocol = url.match(/^(.+?):\/\//)[1]
  return async function (system) {
    const start = new Date()
    const res = await new Promise(resolve =>
      protocols[protocol]
        .get(url, obj => obj.on('data', () => {}).on('end', () => resolve(obj)))
        .on('error', () => resolve({ statusCode: 500 }))
    )
    const dur = new Date() - start
    return {
      ...system,
      statusCode: res.statusCode,
      isResolved: true,
      message: `- ${system.key}: (${url}) ${
        res.statusCode < 400 ? 'OK' : 'ERROR'
      } | Response time: ${dur}ms | Required to work: ${!!system.required}`,
    }
  }
}

async function monitorSystems(req, res, options, monitoredSystems) {
  if (!monitoredSystems) {
    monitoredSystems = options
    options = undefined
  }
  if (req?.url) {
    const localSystem = monitoredSystems.find(system => system.key == 'local')
    const makeLocalUrl = (req, path = '') =>
      `${req.protocol}://${req.host}:${req.socket.localPort}${req.url.replace(/\/_monitor\/?$/, path)}`
    if (!req.url.includes('api') && !options?.noIndexCheck) {
      monitoredSystems.unshift({
        key: 'local index',
        required: true,
        getStatus: urlCheck(localSystem?.testUrl || makeLocalUrl(req)),
      })
    }
    if (req.url.includes('api') && !options?.noSwaggerCheck) {
      monitoredSystems.unshift({
        key: 'local swagger api',
        required: true,
        getStatus: urlCheck(localSystem?.testUrl || makeLocalUrl(req, '/swagger')),
      })
    }
  }
  const response = await Promise.any([
    Promise.allSettled(
      monitoredSystems.map(system => {
        if (system.isResolved) return system
        return waitForStatus(system)
      })
    ),
    (async () => await sleep(8000))(),
  ])
  if (Array.isArray(response)) {
    const data = response.map(({ value, reason }) => value || reason)
    res.status(_getAppStatus(data))
    if (req.headers?.accept === 'application/json') res.json(renderStatusJson(data))
    else res.type('text').send(renderStatusText(data))
    return
  }
  res.status(503)
  if (req.headers?.accept === 'application/json') res.json(renderStatusJson(monitoredSystems))
  else res.type('text').send(renderStatusText(monitoredSystems))
}

module.exports = monitorSystems
