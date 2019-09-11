"use strict";

const log = require("kth-node-log");

const statusCodes = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 501,
  BAD_GATEWAY: 502,
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

const isBadGateway = statusCode => {
  return equalStatusCode(statusCodes.BAD_GATEWAY, statusCode);
};

const isInternalServerError = statusCode => {
  return equalStatusCode(statusCodes.INTERNAL_SERVER_ERROR, statusCode);
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
    case statusCodes.BAD_GATEWAY:
      return `${statusCodes.BAD_GATEWAY} Bad Gateway`;
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

const error = (key, options, requestTimeMs) => {
  return getResponse(key, statusCodes.BAD_GATEWAY, options, requestTimeMs);
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
  return getResponse(key, statusCodes.INTERNAL_SERVER_ERROR, options, -1);
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

const getMessage = (key, statusCode, required, responseTime) => {
  if (isOk(statusCode)) {
    return `- ${key}: OK | Response time: ${responseTime}ms | Required to work: ${required}`;
  }

  let prefix = "";

  if (isBadGateway(statusCode)) {
    prefix = `- ${key}: ERROR - Unable to connect to the service. The service is probably down or it is a networking issue | Response time: ${responseTime}ms |`;
  } else if (isInternalServerError(statusCode)) {
    prefix = `- ${key}: ERROR - Configuration error |`;
  } else {
    prefix = `- ${key}: ERROR - Connected but got an unexpected response from service | Response time: ${responseTime}ms |`;
  }

  if (required) {
    return `${prefix} Has to work for the APPLICATION_STATUS to say OK. | Ref: ${getUniqueReferens()}`;
  }
  return `${prefix} The application can still function without this service. | Ref: ${getUniqueReferens()}`;
};

const getUniqueReferens = () => {
  return Math.random()
    .toString(36)
    .substring(2);
};
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
  error: error,
  worksOrfailed: worksOrfailed,
  configurationError: configurationError
};
