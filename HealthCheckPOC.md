# Class HealthCheck

System controller support functions for "/\_monitor"

_**Alexander Urban (February 2020):** This class is a proof on concept, now. I propose we check if it's working fine with the "\_monitor" pages of our applications. It's then meant to replace the Utility "IHealthCheck" in general and the files "interfaces.js" and "utilities.js" as well as the dependencies "component-registry" and "bluebird" in this package._

## Usage

At first the controller needs to be instantiated, e.g. with

```js
const { HealthCheck } = require('kth-node-monitor')

const systemMonitor = new HealthCheck()
```

The new object will have two functions for every supported sub-system (e.g. "ApiClient", "Redis", "Agenda", "MongoDb"). Those function are called "includeRequired..." and "includeOptional...", e.g.

```js
systemMonitor.includeRequiredApiClient(data)
systemMonitor.includeOptionalRedis(data)
```

There is a function to directly set an object describing the "local system status", e.g.

```js
systemMonitor.setLocalSystemStatus({ statusCode: 200, message: 'No local problems' })
```

After the needed sub-systems are registered, you have to asynchronically call `queryAllStatuses()` before you can use `getStatusCode()`, `getStatusObject()` and `getStatusText()`, e.g.

```js
await systemMonitor.queryAllStatuses()
res.send(systemMonitor.getStatusText())
```

## Currently supported sub-systems

|  system   |                                                                                                                                    |
| :-------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| ApiClient | `systemMonitor.includeRequiredApiClient({ client, key })` or<br/>`systemMonitor.includeOptionalApiClient({ client, key })`         |
|    Api    | `systemMonitor.includeRequiredApi({ endpoint })` or<br/>`systemMonitor.includeOptionalApi({ endpoint })`                           |
|   Ldap    | `systemMonitor.includeRequiredLdap({ ldap })` or<br/>`systemMonitor.includeOptionalLdap({ ldap })`                                 |
|  MongoDb  | `systemMonitor.includeRequiredMongoDb({ db })` or<br/>`systemMonitor.includeOptionalMongoDb({ db })`                               |
|   Redis   | `systemMonitor.includeRequiredRedis({ redis, redisOptions })` or<br/>`systemMonitor.includeOptionalRedis({ redis, redisOptions })` |
|   SqlDb   | `systemMonitor.includeRequiredSqlDb({ db })` or<br/>`systemMonitor.includeOptionalSqlDb({ db })`                                   |
|  Agenda   | `systemMonitor.includeRequiredAgenda({ agendaState })` or<br/>`systemMonitor.includeOptionalAgenda({ agendaState })`               |

## Add / Change supported sub-system in `kth-node-monitor`

The function `_listSupportedSystems()` is used to configure all sub-systems which shall be supported by the class.

All sub-system which shall be supported by this controller must be configured in this helper function. The configuration object shall contain those properties:

### `name` (string)

Description or identifier of the sub-system which will be used in related outputs

### `includeSuffix` (string)

Second part for the names of the two related include methods, e.g. "ApiClient" for "includeRequiredApiClient" and "includeOptionalApiClient"

### `includeDataIsValid` (function)

(optional) Synchronous callback which will be used to ensure that the data argument which is given to a related include method is valid

### `queryFunc` (function)

Callback which will be used during queryAllStatuses() to determine the current status of the sub-system. It might run asynchronously. The callback will be invoked with two arguments: the data from the used include method and internal options (e.g. { name: "kth-node-api-client", required: true })
