/* eslint-env mocha */
"use strict";

// Testing libraries
const expect = require("chai").expect;
const httpResponse = require("../lib/httpResponse");
const utilities = require("../lib/utilities");
const interfaces = require("../lib/interfaces");

describe("HTTP Response", function() {
  it("Every status code should be readable, like '503 Service Unavailable'", function() {
    const result = httpResponse.getStatusName(
      httpResponse.statusCodes.SERVICE_UNAVAILABLE
    );
    expect(result).to.contain("503 Service Unavailable");
  });

  it("200 OK is defined.", function() {
    expect(httpResponse.statusCodes.OK).to.equal(200);
  });

  it("400 Bad Request is defined.", function() {
    expect(httpResponse.statusCodes.BAD_REQUEST).to.equal(400);
  });

  it("404 Not Found is defined.", function() {
    expect(httpResponse.statusCodes.NOT_FOUND).to.equal(404);
  });

  it("501 Internal Server Error is defined.", function() {
    expect(httpResponse.statusCodes.INTERNAL_SERVER_ERROR).to.equal(501);
  });

  it("503 Service Unavailable is defined.", function() {
    expect(httpResponse.statusCodes.SERVICE_UNAVAILABLE).to.equal(503);
  });

  it("Test to see if a request status code is 200 OK.", function() {
    expect(
      httpResponse.isOk(httpResponse.statusCodes.SERVICE_UNAVAILABLE)
    ).to.equal(false);
    expect(httpResponse.isOk(httpResponse.statusCodes.OK)).to.equal(true);
  });

  it("Get the time passed since a timestame", function() {
    const started = Date.now();
    expect(httpResponse.getRequestTimeMs(started)).to.be.below(started + 10);
  });

  it("Get a 501 Internal Server Error when a check is not configuration properly.", function() {
    const responseObject = httpResponse.configurationError(
      interfaces.names.KTH_NODE_API,
      {
        required: true
      }
    );
    expect(responseObject.statusCode).to.equal(
      httpResponse.statusCodes.INTERNAL_SERVER_ERROR
    );
  });

  it("Get information if a service is required to work for the application to work.", function() {
    const responseObject = httpResponse.failed(
      interfaces.names.KTH_NODE_API,
      {
        required: true
      },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.statusCode).to.equal(
      httpResponse.statusCodes.SERVICE_UNAVAILABLE
    );
  });

  it("Get a 503 Service Unavailable message when check faild, and the service is required.", function() {
    const responseObject = httpResponse.failed(
      interfaces.names.KTH_NODE_API,
      {
        required: true
      },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).to.contain(
      "503 Service Unavailable | Response time 123ms - This service has to work"
    );
  });

  it("Get a 503 Service Unavailable message when check faild, and the service is not required.", function() {
    const responseObject = httpResponse.failed(
      interfaces.names.KTH_NODE_API,
      {
        required: false
      },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).to.contain(
      "503 Service Unavailable | Response time 123ms - The application can still function without this service."
    );
  });

  it("Get a 502 Bad Gateway message when check gets an uneqpected error, and the service is not required.", function() {
    const responseObject = httpResponse.error(
      interfaces.names.KTH_NODE_API,
      {
        required: false
      },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).to.contain(
      "502 Bad Gateway | Response time 123ms | Probably an networking issue"
    );
  });
});
