"use strict";

/**
 * System controller support functions for /monitor
 */
const log = require("kth-node-log");
const registry = require("component-registry").globalRegistry;
const { hostname } = require("os");
const { createUtility } = require("component-registry");
const Promise = require("bluebird");
const httpResponse = require("./httpResponse");
const systemResponse = require("./systemResponse");
const cache = require("@kth/in-memory-cache");
const IHealthCheck = require("./interfaces").IHealthCheck;

const names = {
  KTH_NODE_API: "kth-node-api",
  KTH_NODE_API_CLIENT: "kth-node-api-client",
  KTH_NODE_LDAP: "kth-node-ldap",
  KTH_NODE_MONGODB: "kth-node-mongodb",
  KTH_NODE_REDIS: "kth-node-redis",
  KTH_NODE_SYSTEM_CHECK: "kth-node-system-check",
  KTH_NODE_SQLDB: "kth-node-sqldb"
};

// TODO: We should probably cache kth-node-api-client requests but need to consider how
// to construct the cache key properly (preferably a fully qualified URI)
createUtility({
  implements: IHealthCheck,
  name: names.KTH_NODE_API_CLIENT,

  status: function(client, key, endpointPath, options) {
    if (endpointPath === undefined) {
      // We couldn't resolve the endpoint
      return Promise.resolve(httpResponse.configurationError(key, options));
    } else {
      // We call enpoint using pathSegment
      const requestStarted = Date.now();

      // There are two different types of api clients created by kth-node-api-call:
      if (client.getAsync) {
        // 1 -- Handle clients created with require('kth-node-api-call').BasicAPI
        return client
          .getAsync({
            uri: endpointPath
          })
          .then(data => {
            return Promise.resolve(
              httpResponse.worksOrfailed(
                key,
                data.statusCode,
                options,
                httpResponse.getRequestTimeMs(requestStarted)
              )
            );
          })
          .catch(err => {
            log.error(
              { err: err },
              `Caught an unexpected error when checking [1] '${endpointPath}'.`
            );
            return Promise.resolve(
              httpResponse.failed(
                key,
                options,
                httpResponse.getRequestTimeMs(requestStarted)
              )
            );
          });
      } else {
        // 2 -- Handle clients created with require('kth-node-api-call')
        return client
          .promisedApiCall("FreeSeatsCall")
          .then(function(data) {
            return Promise.resolve(
              httpResponse.works(
                key,
                options,
                httpResponse.getRequestTimeMs(requestStarted)
              )
            );
          })
          .catch(err => {
            log.error(
              { err: err },
              `Caught an unexpected error when checking [2] '${endpointPath}'.`
            );
            return Promise.resolve(
              httpResponse.failed(
                key,
                options,
                httpResponse.getRequestTimeMs(requestStarted)
              )
            );
          });
      }
    }
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: names.KTH_NODE_API,

  status: function(endpoint, options) {
    const endpointBaseUri = getUri(endpoint);

    // Configureation error
    if (endpointBaseUri === undefined) {
      return Promise.resolve(httpResponse.configurationError(key, options));

      // Use cache response
    } else if (cache.isValid(endpointBaseUri)) {
      const cacheResponse = cache.get(endpointBaseUri);
      cacheResponse.message += " | Using cached response";
      return Promise.resolve(response);

      // Fetch statuses
    } else {
      const requestStarted = Date.now();

      return endpoint.client
        .getAsync({
          uri: endpointBaseUri + "/_monitor"
        })
        .then(data => {
          const response = httpResponse.worksOrfailed(
            key,
            data.statusCode,
            options,
            httpResponse.getRequestTimeMs(requestStarted)
          );
          cache.add(endpointBaseUri, response);
          return Promise.resolve(response);
        })
        .catch(err => {
          log.error(
            { err: err },
            `Caught an unexpected error when checking ${names.KTH_NODE_API} for '${endpointBaseUri}/_monitor'.`
          );
          const failedResponse = httpResponse.failed(
            key,
            options,
            httpResponse.getRequestTimeMs(requestStarted)
          );
          cache.remove(endpointBaseUri);
          return Promise.resolve(failedResponse);
        });
    }
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: names.KTH_NODE_LDAP,

  status: function(ldap, options) {
    if (options && options.testSearch) {
      return ldap
        .testSearch(options)
        .then(res => {
          return Promise.resolve(
            systemResponse.worksOrfailed(
              systemResponse.keys.LDAP,
              options,
              res.isOk()
            )
          );
        })
        .catch(err => {
          log.error(
            { err: err },
            "[kth-node-ldap] There was an error when resolving ldap status."
          );
          return Promise.resolve(
            systemResponse.failed(systemResponse.keys.LDAP, options)
          );
        });
    } else {
      systemResponse.worksOrfailed(
        systemResponse.keys.LDAP,
        options,
        ldap.isOk()
      );
    }
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: names.KTH_NODE_MONGODB,

  status: function(db, options) {
    return Promise.resolve(
      systemResponse.worksOrfailed(
        systemResponse.keys.MONGO_DB,
        options,
        db.isOk()
      )
    );
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: names.KTH_NODE_SQLDB,

  status: function(db, options) {
    return db
      .connect()
      .then(() => {
        return Promise.resolve(
          systemResponse.works(systemResponse.keys.SQL_DB, options)
        );
      })
      .catch(err => {
        log.error(
          { err: err },
          "There was an error when resolving sqldb status."
        );
        return Promise.resolve(
          systemResponse.failed(systemResponse.keys.SQL_DB, options)
        );
      });
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: names.KTH_NODE_REDIS,
  status: function(redis, redisOptions, options) {
    redisOptions.connect_timeout = 1000;
    return redis("HealthCheck", redisOptions).then(function(client) {
      return new Promise(function(resolve, reject) {
        client.ping(function(err, val) {
          client.quit();
          return resolve(
            systemResponse.worksOrfailed(
              systemResponse.keys.REDIS,
              options,
              err == null
            )
          );
        });
      });
    });
  }
}).registerWith(registry);

createUtility({
  implements: IHealthCheck,
  name: names.KTH_NODE_SYSTEM_CHECK,

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

const getUri = endpoint => {
  if (endpoint == null) {
    return undefined;
  }
  if (endpoint.config == null) {
    return undefined;
  }
  return endpoint.config.proxyBasePath;
};
/**
 * Module exports
 */
module.exports = {
  names: names
};
