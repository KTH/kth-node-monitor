/* eslint-env mocha */
"use strict";

// Testing libraries
const expect = require("chai").expect;
const { hostname } = require("os");

// My code
const Promise = require("bluebird");
const registry = require("component-registry").globalRegistry;
require("../lib");
const { IHealthCheck } = require("../lib").interfaces;

describe("Utilities", function() {
  it("can be found", function() {
    [
      "kth-node-api",
      "kth-node-ldap",
      "kth-node-mongodb",
      "kth-node-redis",
      "kth-node-system-check"
    ].forEach(name => {
      const util = registry.getUtility(IHealthCheck, name);
      expect(util).not.to.equal(undefined);
    });
  });

  it("kth-node-system-check writes OK on first line when ok", function(done) {
    const systemHealthUtil = registry.getUtility(
      IHealthCheck,
      "kth-node-system-check"
    );
    const localSystems = Promise.resolve({ statusCode: 200, message: "OK" });

    systemHealthUtil.status(localSystems).then(status => {
      const outp = systemHealthUtil.renderText(status);
      expect(
        outp.split("\n")[0].indexOf("APPLICATION_STATUS: OK")
      ).not.to.equal(-1);
      done();
    });
  });

  it("kth-node-system-check writes ERRROR on first line when not ok", function(done) {
    const systemHealthUtil = registry.getUtility(
      IHealthCheck,
      "kth-node-system-check"
    );
    const localSystems = Promise.resolve({ statusCode: 503, message: "ERROR" });

    systemHealthUtil.status(localSystems).then(status => {
      const outp = systemHealthUtil.renderText(status);
      expect(
        outp.split("\n")[0].indexOf("APPLICATION_STATUS: ERROR")
      ).not.to.equal(-1);
      done();
    });
  });

  it("contains local system status to be part of output", function(done) {
    const systemHealthUtil = registry.getUtility(
      IHealthCheck,
      "kth-node-system-check"
    );
    const localSystems = Promise.resolve({
      statusCode: 503,
      message: "Freedom"
    });

    systemHealthUtil.status(localSystems).then(status => {
      const outp = systemHealthUtil.renderText(status);
      expect(outp.indexOf("- local system: Freedom")).not.to.equal(-1);
      done();
    });
  });

  it("contains host name to be part of output", function(done) {
    const systemHealthUtil = registry.getUtility(
      IHealthCheck,
      "kth-node-system-check"
    );
    const localSystems = Promise.resolve({ statusCode: 200, message: "Ok" });

    systemHealthUtil.status(localSystems).then(status => {
      const outp = systemHealthUtil.renderText(status);
      expect(outp.indexOf(`- host name: ${hostname()}`)).not.to.equal(-1);
      done();
    });
  });
});
