/* eslint-env mocha */
"use strict";

// Testing libraries
const expect = require("chai").expect;
const systemResponse = require("../lib/systemResponse");
const httpResponse = require("../lib/httpResponse");
const utilities = require("../lib/utilities");
const interfaces = require("../lib/interfaces");

describe("System Response", function() {
  it("Get a 501 Internal Server Error when a check is not configuration properly.", function() {
    const responseObject = httpResponse.configurationError(
      interfaces.names.KTH_NODE_MONGODB,
      {
        required: true
      }
    );
    expect(responseObject.statusCode).to.equal(
      httpResponse.statusCodes.INTERNAL_SERVER_ERROR
    );
  });

  it("Get a OK message when check worked, and required.", function() {
    const responseObject = systemResponse.works(
      interfaces.names.KTH_NODE_MONGODB,
      {
        required: true
      }
    );
    expect(responseObject.message).to.contain("OK | Required to work: true");
  });

  it("Get a OK message when check worked, and not required.", function() {
    const responseObject = systemResponse.works(
      interfaces.names.KTH_NODE_MONGODB,
      {
        required: false
      }
    );
    expect(responseObject.message).to.contain("OK | Required to work: false");
  });

  it("Get a 'The application can still function' message when check faild, and required.", function() {
    const responseObject = systemResponse.failed(
      interfaces.names.KTH_NODE_MONGODB,
      {
        required: true
      }
    );
    expect(responseObject.message).to.contain(
      "Error | This service has to work"
    );
  });

  it("Get a 'The application can still function' message when check faild, and not required.", function() {
    const responseObject = systemResponse.failed(
      interfaces.names.KTH_NODE_MONGODB,
      {
        required: false
      }
    );
    expect(responseObject.message).to.contain(
      "Error | The application can still function"
    );
  });

  it("Get information if a service is required to work for the application to work.", function() {
    const responseObject = systemResponse.failed(
      interfaces.names.KTH_NODE_MONGODB,
      {
        required: true
      }
    );
    expect(responseObject.statusCode).to.equal(
      httpResponse.statusCodes.SERVICE_UNAVAILABLE
    );
  });
});
