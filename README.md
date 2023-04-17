# @kth/monitor ![Continous Integration](https://github.com/KTH/kth-node-monitor/actions/workflows/main.yml/badge.svg)

Helper utilities for KTH/node-projects

## Changes in v4

There are some major changes, but hopefully nothing that should break current implementations.

### Typescript

Package is now in typescript.
Usage in vanilla-js-apps should work as before.

### 3 levels of monitoring

Different level of dependency check will now be performed depending on the "probe"-parameter supplied to a request, like `/_monitor?probe=readyness`

- **liveness**
  Checks only the application, no dependencies.

- **readyness**
  Checks the application, and the system that are exlusive for the application, _redis_, _sqldb_ and _mongodb_

- **full**
  Checks the application and all dependencies. Calls to other api's are done to their _liveness_ probe, to prevent circullar calls.

If no probe param is supplied, liveness check is performed.

### Unused and superfluous systems removed.

Some systems are removed, to simplify the package.

- **local**
  This was checking a local page in web-apps, which had lot of unintended external dependencies, or the /swagger endpoint in api's, which is not critical for operation.
  In most cases, if the monitor is able to respond, then the app is alive.

- **agenda**
  Agenda configuration is run at startup, and should not change during runtime. It is better checked in the /\_status andpoint.
  Issues with mongodb can cause agenda to fail, but that is checked in other places.

- **ldap**
  This does not seem to be used anywhere anymore.

- **custom function**
  Custom getStatus function. Had a low usage-rate and complex implementation.

If any deprecated systems remain in the config, the monitor will still work, but warnings will be logged.
If you use typescript the above systems will not be accepted.

If you feel that something you really need is removed, please open a issue in this repo, or contact the webb-team.

### Required-flag

The `required`-option on subsystems still exists, but currently has no effect on the monitor result.

## Usage

Usage example:

```typescript
import { monitorRequest } from '@kth/monitor'

async function getMonitor(req, res) {
  try {
    await monitorRequest(req, res, [
      {
        key: 'mongodb',
        db,
      },
      // Add systems to check here
    ])
  } catch (error) {
    log.error(`Monitor failed`, error)
    res.status(500).end()
  }
}
```

**monitorRequest**

```typescript
monitorRequest = async (req: Request, res: Response, monitoredSystems: MonitoredSystem[])
```

A helper method that handles an express request to the monitor endpoint.

### System checks

**MongoDb**  
Checked on _readyness_ probes

```typescript
{
  key: 'mongodb',
  db: (instance of @kth/mongo)
}
```

**Redis**  
Checked on _readyness_ probes

```typescript
{
  key: 'redis',
  redis: (instance of @kth/redis)
  options: (options for redis)
}
```

**SQLDb**  
Checked on _readyness_ probes

```typescript
{
  key: 'sqldb',
  db: {
    connect: // async function implementing database connection
  }
}
```

**KTH Node-api**  
Checked on _full_ probes

```typescript
const api = require('../api') //'@kth/api-call' intances

{
  key: apiName,
  endpoint: api[apiName],
}
```

## The \_monitor request

### Http params

The monitor checks the "probe" param to determine the level of checks to perform.

### Response type

The response is by default in plain text.  
Use header `'accept: application/json'` for Json-response.

### Timeout

Checks on sub-systems has a timeout of 5 seconds.

### Result

Each system result has an optional "message" field, used when whings gone wrong. This is not structured in a specific way, so do not parse this with code.

### Examples

A simple request

```bash
curl '/_monitor?probe=readyness'
```

```
APPLICATION_STATUS: OK
mongodb - OK
mongodb - OK
```

A failing JSON request

```bash
curl --request GET \
  --url '/_monitor?probe=full' \
  --header 'accept: application/json'
```

```json
{
  "message": "ERROR",
  "subSystems": [
    {
      "key": "nodeApi",
      "result": {
        "status": false,
        "message": "FetchError: request to /api/node/_monitor failed, reason: connect ECONNREFUSED"
      }
    },
    {
      "key": "redis",
      "result": {
        "status": false,
        "message": "system timed out"
      }
    }
  ]
}
```
