"use strict";

const statusCodes = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 501,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Module exports
 */
module.exports = {
  statusCodes: statusCodes
};
