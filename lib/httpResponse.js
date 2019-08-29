"use strict";

const statusCodes = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 501,
  SERVICE_UNAVAILABLE: 503
};

const equalStatusCode = (statusCode, compareTo) => {
  if (compareTo == null) {
    return false;
  }
  return statusCode == compareTo;
};

const isOk = statusCode => {
  return equalStatusCode(statusCodes.OK, statusCode);
};

const getStatusName = statusCode => {
  switch (statusCode) {
    case statusCodes.OK:
      return `${statusCodes.OK} OK`;
    case statusCodes.BAD_REQUEST:
      return `${statusCodes.BAD_REQUEST} Bad Request`;
    case statusCodes.NOT_FOUND:
      return `${statusCodes.NOT_FOUND} Not Found`;
    case statusCodes.INTERNAL_SERVER_ERROR:
      return `${statusCodes.INTERNAL_SERVER_ERROR} Internal Server Error`;
    case statusCodes.SERVICE_UNAVAILABLE:
      return `${statusCodes.SERVICE_UNAVAILABLE} Service Unavailable`;
    default:
      return `${statusCode} Undefiend status code.`;
  }
};

const getRequestTimeMs = requestStarted => {
  return Date.now() - requestStarted;
};

const isRequired = options => {
  if (options == null) {
    return false;
  }

  if (options.required == null) {
    return false;
  }
  return ("" + options.required).toLowerCase() === "true";
};

const worksOrfailed = (key, statusCode, options, requestTimeMs) => {
  if (isOk(statusCode)) {
    return works(key, options, requestTimeMs);
  }
  return failed(key, options, requestTimeMs);
};

const works = (key, options, requestTimeMs) => {
  return getResponse(key, statusCodes.OK, options, requestTimeMs);
};

const failed = (key, options, requestTimeMs) => {
  return getResponse(
    key,
    statusCodes.SERVICE_UNAVAILABLE,
    options,
    requestTimeMs
  );
};

const configurationError = (key, options) => {
  return getResponse(
    key,
    statusCodes.INTERNAL_SERVER_ERROR,
    isRequired(options),
    -1
  );
};

const getResponse = (key, statusCode, options, responseTime) => {
  return {
    key: key,
    statusCode: statusCode,
    required: isRequired(options),
    message: getMessage(key, statusCode, isRequired(options), responseTime),
    responseTime: responseTime
  };
};

function getMessage(key, statusCode, required, responseTime) {
  if (isOk(statusCode)) {
    return `- ${key}: OK after after ${responseTime}ms (Required to work: ${required})`;
  }

  if (required) {
    return `- ${key}: ${getStatusName(
      statusCode
    )} after after ${responseTime}ms - This service has to work for the APPLICATION_STATUS to say OK.`;
  }

  return `- ${key}: ${getStatusName(
    statusCode
  )} after after ${responseTime}ms - The application can function without this service.`;
}

/**
 * Module exports
 */
module.exports = {
  statusCodes: statusCodes,
  isOk: isOk,
  getStatusName: getStatusName,
  getRequestTimeMs: getRequestTimeMs,
  works: works,
  failed: failed,
  worksOrfailed: worksOrfailed,
  configurationError: configurationError
};