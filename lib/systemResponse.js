"use strict";

const httpResponse = require("./httpResponse");

const keys = {
  REDIS: "redis",
  LDAP: "ldap",
  MONGO_DB: "mongodb",
  SQL_DB: "sqldb"
};

const worksOrfailed = (key, option, testWorked) => {
  if (testWorked) {
    return works(key, option, requestTimeMs);
  }
  return failed(key, option, requestTimeMs);
};

const works = (key, options) => {
  return getResponse(key, statusCodes.OK, options);
};

const failed = (key, option) => {
  return getResponse(key, statusCodes.SERVICE_UNAVAILABLE, options);
};

const getResponse = (key, statusCode, options) => {
  return {
    key: key,
    statusCode: statusCode,
    required: isRequired(options),
    message: getMessage(key, statusCode, isRequired(options))
  };
};

function getMessage(key, statusCode, required) {
  if (httpResponse.isOk(statusCode)) {
    return `- ${key}: OK (Required to work: ${required})`;
  }

  if (required) {
    return `- ${key}: ${getStatusName(
      statusCode
    )}. This service has to work for the APPLICATION_STATUS to say OK.`;
  }

  return `- ${key}: ${getStatusName(
    statusCode
  )}. The application can function without this service.`;
}

const isRequired = options => {
  if (options == null) {
    return false;
  }

  if (option.required == null) {
    return false;
  }
  return options.required.toLowerCase() === "true";
};

/**
 * Module exports
 */
module.exports = {
  keys: keys,
  works: works,
  failed: failed,
  worksOrfailed: worksOrfailed
};
