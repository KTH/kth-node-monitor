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
  return statusCode === compareTo;
};

const isOk = statusCode => {
  return equalStatusCode(statusCode.OK, statusCode);
};

const getStatusName = statusCode => {
  switch (statusCode) {
    case statusCode.OK:
      return `${statusCode.OK} OK`;
    case statusCode.BAD_REQUEST:
      return `${statusCode.BAD_REQUEST} Bad Request`;
    case statusCode.NOT_FOUND:
      return `${statusCode.NOT_FOUND} Not Found`;
    case statusCode.INTERNAL_SERVER_ERROR:
      return `${statusCode.INTERNAL_SERVER_ERROR} Internal Server Error`;
    case statusCode.SERVICE_UNAVAILABLE:
      return `${statusCode.SERVICE_UNAVAILABLE} Service Unavailable`;
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

  if (option.required == null) {
    return false;
  }
  return options.required.toLowerCase() === "true";
};

const worksOrfailed = (key, statusCode, option, requestTimeMs) => {
  if (isOk(statusCode)) {
    return works(key, option, requestTimeMs);
  }
  return failed(key, option, requestTimeMs);
};

const works = (key, option, requestTimeMs) => {
  return getResponse(key, statusCodes.OK, options, requestTimeMs);
};

const failed = (key, option, requestTimeMs) => {
  return getResponse(
    key,
    statusCodes.SERVICE_UNAVAILABLE,
    options,
    requestTimeMs
  );
};

const configurationError = (key, option) => {
  return getResponse(
    key,
    statusCodes.INTERNAL_SERVER_ERROR,
    isRequired(option),
    -1
  );
};

const getResponse = (key, statusCode, required, responseTime) => {
  return {
    key: key,
    statusCode: statusCode,
    required: required,
    message: getMessage(key, statusCode, required, responseTime),
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
  getRequestTimeMs: getRequestTimeMs,
  works: works,
  failed: failed,
  worksOrfailed: worksOrfailed,
  configurationError: configurationError
};
