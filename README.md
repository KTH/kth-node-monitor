# kth-node-monitor [![Build Status](https://travis-ci.org/kth/kth-node-monitor.svg?branch=master)](https://travis-ci.org/kth/kth-node-monitor)

Helper utilities for KTH/node-projects

Some use cases to consider:

- no answer from \_monitor
- slow response times
- circular dependencies
- service down

Circular dependecies

- on start up and REQUIRED dep is down
  we add subsystems from ../init/api and a dependecy won't be checked
  until the apiClient has been correctly initiated so we will be staged
  by Netscaler

- running and REQUIRED dep goes down
  we will report fail and be unstaged by Netscaler, when dep is started and
  staged again we will report OK and we will be staged by Netscaler again

- running and REQUIRED dep goes up again

- if circular deps and roundtrip takes more than 1s
  there will be an infinite call loop and the original caller will time out
  and if REQUIRED will cause unstaging by Netscaler. Then all deps will be unstaged.
  Services will need to be restarted in order to return OK and be staged by Netscaler

## HealthCheck

Since version 2.0.0 the method of setting up the health check has changed. For this, simply define an array of objects such as this:
```javascript
{
  key: apiKey,
  required: apiConfig[apiKey].required,
  endpoint: api[apiKey],
}
```
Or, alternatively, if you have a custom health check function that you wish to use:
```javascript
{
  key: 'some name',
  required: true, // if required
  getStatus: system => customHealthStatusFunction(system),  // can of course in this case be abbreviated to simply getStatus: customHealthStatusFunction
}
```
LDAP check:
```javascript
{
  key: 'ldap',
  required: true, // if required
  ldap: (ldap object)
  options: (options for ldap search)
}
```
Redis check:
```javascript
{
  key: 'redis',
  required: true, // if required
  redis: (redis object)
  options: (options for redis)
}
```
MongoDb check:
```javascript
{
  key: 'mongodb',
  required: true, // if required
  db: (db object)
}
```
SQLDb check:
```javascript
{
  key: 'sqldb',
  required: true, // if required
  db: (db object)
}
```
Agenda check:
```javascript
{
  key: 'agenda',
  required: true, // if required
  agendaState: state for agenda
}
```
Do not forget to add a local object to the array as well:
```javascript
{
  key: 'local',
  isResolved: true,
  message: '- local system checks: OK',
  statusCode: 200,
}
```
Then send the array to the monitor function along with request/response objects. 
```javascript
kthNodeMonitor(req, res, arrayOfSystemsToMonitor)
```
