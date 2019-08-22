"use strict";

/**
 * System controller support functions for /monitor
 */
const log = require("kth-node-log");
const { safeGet } = require("safe-utils");
const registry = require("component-registry").globalRegistry;
const { hostname } = require("os");
const { createUtility } = require("component-registry");
const Promise = require("bluebird");
const httpResponse = require("./httpResponse");
const IHealthCheck = require("./interfaces").IHealthCheck;

function _createApiStatusObj(key, statusCode, required, responseTime) {
  var message;
  if (statusCode === httpResponse.statusCodes.OK) {
    message =
      `- ${key}: OK` +
      (responseTime ? ` (${responseTime}ms)` : "") +
      (required ? " (required)" : "");
  } else if (required) {
    message =
      `- ${key}: ERROR -- status code: ${statusCode}` +
      (responseTime ? ` (${responseTime}ms)` : "");
    message +=
      " (WARNING! This API is required to be ok for system to report ok)";
  } else {
    message =
      `- ${key}: WARNING -- status code: ${statusCode}` +
      (responseTime ? ` (${responseTime}ms)` : "");
    message += " (This API is NOT required to be ok for system to report ok)";
  }

  log.info(
    `Status: '${key}' is '${statusCode}' and '${message}' '${responseTime}ms'.`
  );

  return {
    key: key,
    statusCode: statusCode,
    required: required,
    message: message,
    responseTime: responseTime
  };
}

const apiCallCache = {};
function _setCache(key, statusObj) {
  apiCallCache[key] = { statusObj: statusObj, timestamp: Date.now() };
}
function _getCache(key) {
  return apiCallCache[key];
}

// TODO: We should probably cache kth-node-api-client requests but need to consider how
// to construct the cache key properly (preferably a fully qualified URI)
createUtility({
  implements: IHealthCheck,
  name: "kth-node-api-client",

  status: function(client, key, endpointPath, options) {
    if (endpointPath === undefined) {
      // We couldn't resolve the endpoint
      return Promise.resolve(
        _createApiStatusObj(
          key,
          httpResponse.statusCodes.BAD_REQUEST,
          options && options.required
        )
      );
    } else {
      // We call enpoint using pathSegment
      const t0 = Date.now();

      // There are two different types of api clients created by kth-node-api-call:
      if (client.getAsync) {
        // 1 -- Handle clients created with require('kth-node-api-call').BasicAPI
        return client
          .getAsync({
            uri: endpointPath
          })
          .then(data => {
            const statusObj = _createApiStatusObj(
              key,
              data.statusCode,
              options && options.required,
              Date.now() - t0
            );
            return Promise.resolve(statusObj);
          })
          .catch(err => {
            log.error(
              { err: err },
              `Caught an unexpected error when checking [1] '${endpointPath}'.`
            );
            const statusObj = _createApiStatusObj(
              key,
              httpResponse.statusCodes.SERVICE_UNAVAILABLE,
              options && options.required
            );
            return Promise.resolve(statusObj);
          });
      } else {
        // 2 -- Handle clients created with require('kth-node-api-call')
        return client
          .promisedApiCall("FreeSeatsCall")
          .then(function(data) {
            const statusObj = _createApiStatusObj(
              key,
              httpResponse.statusCodes.OK,
              options && options.required,
              Date.now() - t0
            );
            return Promise.resolve(statusObj);
          })
          .catch(err => {
            log.error(
              { err: err },
              `Caught an unexpected error when checking [2] '${endpointPath}'.`
            );
            const statusObj = _createApiStatusObj(
              key,
              httpResponse.statusCodes.SERVICE_UNAVAILABLE,
              options && options.required
            );
            return Promise.resolve(statusObj);
          });
      }
    }
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: "kth-node-api",

  status: function(endpoint, options) {
    // Check that we haven't called this endpoint during the last 1000ms to avoid flooding monitor pages
    // or feedback loops
    const endpointBaseUri = safeGet(() => endpoint.config.proxyBasePath);

    if (endpointBaseUri === undefined) {
      // We couldn't resolve the endpoint
      return Promise.resolve(
        _createApiStatusObj(
          endpoint.key,
          httpResponse.statusCodes.BAD_REQUEST,
          options && options.required
        )
      );
    } else if (
      safeGet(() => Date.now() - _getCache(endpointBaseUri).timestamp < 1000)
    ) {
      // We got a hit in the cache
      const statusObj = safeGet(() => _getCache(endpointBaseUri).statusObj);

      // Adding cacheTimestamp props to returned object if result was taken from cache
      const outp = Object.assign({}, statusObj, {
        cacheTimestamp: _getCache(endpointBaseUri).timestamp
      });
      outp.message =
        outp.message +
        " --- cached (" +
        (Date.now() - _getCache(endpointBaseUri).timestamp) +
        "ms)";
      return Promise.resolve(outp);
    } else {
      // We need to perform a request to api _monitor page
      // TODO: Set header accepts: application/json
      const t0 = Date.now();
      return endpoint.client
        .getAsync({
          uri: endpointBaseUri + "/_monitor"
        })
        .then(data => {
          const statusObj = _createApiStatusObj(
            endpoint.key,
            data.statusCode,
            options && options.required,
            Date.now() - t0
          );
          _setCache(endpointBaseUri, statusObj);
          return Promise.resolve(statusObj);
        })
        .catch(err => {
          log.error(
            { err: err },
            `Caught an unexpected error when checking [3] '${endpointBaseUri}'.`
          );
          const statusObj = _createApiStatusObj(
            endpoint.key,
            httpResponse.statusCodes.SERVICE_UNAVAILABLE,
            options && options.required
          );
          _setCache(endpointBaseUri, statusObj);
          return Promise.resolve(statusObj);
        });
    }
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: "kth-node-ldap",

  status: function(ldap, options) {
    if (options && options.testSearch) {
      return ldap
        .testSearch(options)
        .then(res => {
          if (res.isOk) {
            return Promise.resolve({
              key: "ldap",
              statusCode: httpResponse.statusCodes.OK,
              message: `- ldap: OK`
            });
          } else {
            return Promise.resolve({
              key: "ldap",
              statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
              message: `- ldap: ERROR (${res.msg})`
            });
          }
        })
        .catch(err => {
          log.error(
            { err: err },
            "[kth-node-ldap] There was an error when resolving ldap status."
          );
          return Promise.resolve({
            key: "ldap",
            statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
            message: `- ldap: ERROR (${err.message})`
          });
        });
    } else {
      if (ldap.isOk()) {
        return Promise.resolve(
          _createApiStatusObj(
            "ldap",
            httpResponse.statusCodes.OK,
            options && options.required
          )
        );
      } else {
        return Promise.resolve(
          _createApiStatusObj(
            "ldap",
            httpResponse.statusCodes.SERVICE_UNAVAILABLE,
            options && options.required
          )
        );
      }
    }
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: "kth-node-mongodb",

  status: function(db, options) {
    if (db.isOk()) {
      return Promise.resolve(
        _createApiStatusObj(
          "mongodb",
          httpResponse.statusCodes.OK,
          options && options.required
        )
      );
    } else {
      return Promise.resolve(
        _createApiStatusObj(
          "mongodb",
          httpResponse.statusCodes.SERVICE_UNAVAILABLE,
          options && options.required
        )
      );
    }
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: "kth-node-sqldb",

  status: function(db, options) {
    return db
      .connect()
      .then(() => {
        return Promise.resolve(
          _createApiStatusObj(
            "sqldb",
            httpResponse.statusCodes.OK,
            options && options.required
          )
        );
      })
      .catch(err => {
        log.error(
          { err: err },
          "[kth-node-ldap] There was an error when resolving sqldb status."
        );
        return Promise.resolve(
          _createApiStatusObj(
            "sqldb",
            httpResponse.statusCodes.SERVICE_UNAVAILABLE,
            options && options.required
          )
        );
      });
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: "kth-node-redis",
  status: function(redis, redisOptions, options) {
    redisOptions.connect_timeout = 1000;
    return redis("HealthCheck", redisOptions).then(function(client) {
      return new Promise(function(resolve, reject) {
        client.ping(function(err, val) {
          client.quit();
          if (err) {
            return resolve(
              _createApiStatusObj(
                "redis",
                httpResponse.statusCodes.SERVICE_UNAVAILABLE,
                options && options.required
              )
            );
          } else {
            return resolve(
              _createApiStatusObj(
                "redis",
                httpResponse.statusCodes.OK,
                options && options.required
              )
            );
          }
        });
      });
    });
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: "kth-node-system-check",

  status: function(localSystems, subSystems) {
    // Handle if we don't have subsystems
    subSystems = subSystems || [Promise.resolve(undefined)];

    // Consolidate all results
    return Promise.all(subSystems)
      .then(results => {
        const outp = {};
        results.forEach(status => {
          if (typeof status === "object") {
            outp[status.key] = status;
          }
        });
        return Promise.resolve(outp);
      })
      .then(subSystems => {
        return localSystems.then(result =>
          Promise.resolve({ localSystems: result, subSystems: subSystems })
        );
      })
      .then(result => {
        const subSystems = result.subSystems;
        const localSystems = result.localSystems;

        var systemOk = Object.keys(subSystems).reduce((systemOk, apiKey) => {
          return (
            systemOk &&
            (subSystems[apiKey].required
              ? subSystems[apiKey].statusCode === httpResponse.statusCodes.OK
              : true)
          );
        }, localSystems.statusCode === httpResponse.statusCodes.OK);

        return {
          statusCode: systemOk
            ? httpResponse.statusCodes.OK
            : httpResponse.statusCodes.SERVICE_UNAVAILABLE,
          message: systemOk ? "OK" : "ERROR",
          subSystems: subSystems,
          localSystems: localSystems
        };
      })
      .catch(err => {
        log.error(
          { err: err },
          "[kth-node-system-check] There was an error when resolving application status."
        );
        return {
          statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
          message:
            "ERROR: " +
            (err.message || "[kth-node-system-check] Unknown error"),
          subSystems: subSystems,
          localSystems: localSystems
        };
      });
  },

  renderJSON: function(systemHealth) {
    return systemHealth;
  },

  renderText: function(systemHealth) {
    var outp = `APPLICATION_STATUS: ${systemHealth.message}` + "\n";
    outp += Object.keys(systemHealth.subSystems)
      .map(apiKey => {
        return systemHealth.subSystems[apiKey].message;
      })
      .join("\n");
    outp += `\n- local system: ${systemHealth.localSystems.message}\n\n`;
    outp += [
      "*** Local System Stats ***",
      "- host name: " + hostname(),
      "*** ****************** ***"
    ].join("\n");
    return outp;
  }
}).registerWith(registry);
