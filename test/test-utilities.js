/* eslint-env mocha */
"use strict";

// Testing libraries
const expect = require("chai").expect;
const { hostname } = require("os");

// My code
const Promise = require("bluebird");
const registry = require("component-registry").globalRegistry;
require("../lib");
const interfaces = require("../lib/interfaces");

const utilities = require("../lib/utilities");
const httpResponse = require("../lib/httpResponse");
const systemResponse = require("../lib/systemResponse");

const getUtilityNames = () => {
  let values = [];
  Object.keys(interfaces.names).forEach(name => {
    values.push(interfaces.names[name]);
  });
  return values;
};

describe("Utilities", function() {
  it(`All ${
    getUtilityNames().length
  } types of checks can be found.`, function() {
    getUtilityNames().forEach(name => {
      const util = registry.getUtility(interfaces.IHealthCheck, name);
      expect(util).not.to.equal(undefined);
    });
  });
});

describe("Utilities / Status check (kth-node-system-check).", function() {
  it("The monitor response writes APPLICATION_STATUS: OK when local systems are working", function(done) {
    const systemHealthUtil = registry.getUtility(
      interfaces.IHealthCheck,
      interfaces.names.KTH_NODE_SYSTEM_CHECK
    );
    const localSystems = Promise.resolve({
      statusCode: httpResponse.statusCodes.OK,
      message: "OK"
    });

    systemHealthUtil.status(null).then(status => {
      const response = systemHealthUtil.renderText(status);
      expect(
        response.split("\n")[0].indexOf("APPLICATION_STATUS: OK")
      ).not.to.equal(-1);
      done();
    });
  });

  it("The monitor response writes APPLICATION_STATUS: ERROR when one of the local systems are in faild state.", function(done) {
    const systemHealthUtil = registry.getUtility(
      interfaces.IHealthCheck,
      interfaces.names.KTH_NODE_SYSTEM_CHECK
    );
    const localSystems = Promise.resolve({
      statusCode: httpResponse.statusCodes.SERVICE_UNAVAILABLE,
      message: "ERROR"
    });

    systemHealthUtil.status(localSystems).then(status => {
      const response = systemHealthUtil.renderText(status);
      expect(
        response.split("\n")[0].indexOf("APPLICATION_STATUS: ERROR")
      ).not.to.equal(-1);
      done();
    });
  });

  it("The monitor response contains the local systems status message.", function(done) {
    const systemHealthUtil = registry.getUtility(
      interfaces.IHealthCheck,
      interfaces.names.KTH_NODE_SYSTEM_CHECK
    );
    const localSystems = Promise.resolve({
      statusCode: httpResponse.statusCodes.OK,
      message: "A status message"
    });

    systemHealthUtil.status(localSystems).then(status => {
      const response = systemHealthUtil.renderText(status);
      expect(response).to.contain("A status message");
      done();
    });
  });

  it("The monitor response contains host name.", function(done) {
    const systemHealthUtil = registry.getUtility(
      interfaces.IHealthCheck,
      interfaces.names.KTH_NODE_SYSTEM_CHECK
    );
    const localSystems = Promise.resolve({ statusCode: 200, message: "Ok" });

    systemHealthUtil.status(localSystems).then(status => {
      const response = systemHealthUtil.renderText(status);
      expect(response.indexOf(`Hostname: ${hostname()}`)).not.to.equal(-1);
      done();
    });
  });
});
