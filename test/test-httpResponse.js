/* eslint-env mocha */
"use strict";

// Testing libraries
const expect = require("chai").expect;
const httpResponse = require("../lib/httpResponse");

describe("HTTP Response", function() {
  it("Every status code should be readable, like '503 Service Unavailable'", function() {
    const result = httpResponse.getStatusName(
      httpResponse.statusCodes.SERVICE_UNAVAILABLE
    );
    expect(result).to.contain("503 Service Unavailable");
  });
});
