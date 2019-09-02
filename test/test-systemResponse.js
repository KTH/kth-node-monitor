/* eslint-env mocha */
"use strict";

// Testing libraries
const expect = require("chai").expect;
const systemResponse = require("../lib/systemResponse");
const httpResponse = require("../lib/httpResponse");
const utilities = require("../lib/utilities");

describe("System Response", function() {
  it("Get a 501 Internal Server Error when a check is not configuration properly.", function() {
    const responseObject = httpResponse.configurationError(
      utilities.names.KTH_NODE_MONGODB,
      {
        required: true
      }
    );
    expect(responseObject.statusCode).to.equal(
      httpResponse.statusCodes.INTERNAL_SERVER_ERROR
    );
  });

  it("Get a 200 Ok message when OK, and required.", function() {
    const responseObject = systemResponse.works(
      utilities.names.KTH_NODE_MONGODB,
      {
        required: true
      }
    );
    expect(responseObject.message).to.contain("OK (Required to work: true)");
  });

  it("Get a 200 Ok message when OK, and not required.", function() {
    const responseObject = systemResponse.works(
      utilities.names.KTH_NODE_MONGODB,
      {
        required: false
      }
    );
    expect(responseObject.message).to.contain("OK (Required to work: false)");
  });

  it("Get a 503 Service Unavailable message when check faild, and required.", function() {
    const responseObject = systemResponse.failed(
      utilities.names.KTH_NODE_MONGODB,
      {
        required: true
      }
    );
    expect(responseObject.message).to.contain(
      "503 Service Unavailable. This service has to work"
    );
  });

  it("Get a 503 Service Unavailable message when check faild, and not required.", function() {
    const responseObject = systemResponse.failed(
      utilities.names.KTH_NODE_MONGODB,
      {
        required: false
      }
    );
    expect(responseObject.message).to.contain(
      "503 Service Unavailable. The application can function without this service."
    );
  });

  it("Get information if a service is required to work for the application to work.", function() {
    const responseObject = systemResponse.failed(
      utilities.names.KTH_NODE_MONGODB,
      {
        required: true
      }
    );
    expect(responseObject.statusCode).to.equal(
      httpResponse.statusCodes.SERVICE_UNAVAILABLE
    );
  });
});
