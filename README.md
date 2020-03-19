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

Now, there is a health check controller which works without depending on NPM package `component-registry`.

Look at [HealthCheckPOC.md](./HealthCheckPOC.md) for more details.

### Development Notes

If we have issues with recursive rependencies that resolve slowly we will need to implement one or both of the following:

LIFECYCLE JSON CALLS

PENDING -- starting shows pending for 30secs regardless of state of REQUIRED dependecies
to allow consuming services to start up, OR if REQUIRED dependencies have status pending
PENDING resolves to OK as text to please Netscaler
OK -- all REQUIRED dependencies are OK
ERROR -- at least one (1) REQUIRED dep is down

pass formData on requests

{
resolved: ['uri/to/service']
}

To handle recursive references we need:

Starting service:

- if required are OK OK | OK
- if required are PENDING OK | PENDING
- if required are ERROR or down OK | PENDING
  After 30s:
- if required are OK OK | OK
- if required are PENDING OK | PENDING
- if required are ERROR ERROR | ERROR
  Required goes down ERROR | ERROR
  Required goes up again
- if required PENDING OK | PENDING
- if required OK OK | OK

```text

  HTTP Response
    ✓ Every status code should be readable, like '503 Service Unavailable'
    ✓ 200 OK is defined.
    ✓ 400 Bad Request is defined.
    ✓ 404 Not Found is defined.
    ✓ 501 Internal Server Error is defined.
    ✓ 503 Service Unavailable is defined.
    ✓ Test to see if a request status code is 200 OK.
    ✓ Get the time passed since a timestame
    ✓ Get a 501 Internal Server Error when a check is not configuration properly.
    ✓ Get information if a service is required to work for the application to work.
    ✓ Get a 503 Service Unavailable message when check faild, and the service is required.
    ✓ Get a 503 Service Unavailable message when check faild, and the service is not required.

  System Response
    ✓ Get a 501 Internal Server Error when a check is not configuration properly.
    ✓ Get a 200 Ok message when OK, and required.
    ✓ Get a 200 Ok message when OK, and not required.
    ✓ Get a 503 Service Unavailable message when check faild, and required.
    ✓ Get a 503 Service Unavailable message when check faild, and not required.
    ✓ Get information if a service is required to work for the application to work.

  Utilities
    ✓ All 7 types of checks can be found.

  Utilities / Status check (kth-node-system-check).
    ✓ The monitor response writes APPLICATION_STATUS: OK when local systems are working
    ✓ The monitor response writes APPLICATION_STATUS: ERROR when one of the local systems are in faild state.
    ✓ The monitor response contains the local systems status message.
    ✓ The monitor response contains host name.

```
