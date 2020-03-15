"use strict";

console.log = jest.fn();

const httpResponse = require("./httpResponse");

const interfaces = require("./interfaces");

describe("HTTP Response", () => {
  it("Every status code should be readable, like '503 Service Unavailable'", () => {
    const result = httpResponse.getStatusName(
      httpResponse.statusCodes.SERVICE_UNAVAILABLE
    );
    expect(result).toContain("503 Service Unavailable");
  });

  it("200 OK is defined.", () => {
    expect(httpResponse.statusCodes.OK).toEqual(200);
  });

  it("400 Bad Request is defined.", () => {
    expect(httpResponse.statusCodes.BAD_REQUEST).toEqual(400);
  });

  it("404 Not Found is defined.", () => {
    expect(httpResponse.statusCodes.NOT_FOUND).toEqual(404);
  });

  it("501 Internal Server Error is defined.", () => {
    expect(httpResponse.statusCodes.INTERNAL_SERVER_ERROR).toEqual(501);
  });

  it("503 Service Unavailable is defined.", () => {
    expect(httpResponse.statusCodes.SERVICE_UNAVAILABLE).toEqual(503);
  });

  it("Test to see if a request status code is 200 OK.", () => {
    expect(
      httpResponse.isOk(httpResponse.statusCodes.SERVICE_UNAVAILABLE)
    ).toEqual(false);
    expect(httpResponse.isOk(httpResponse.statusCodes.OK)).toEqual(true);
  });

  it("Get the time passed since a timestame", () => {
    const started = Date.now();
    expect(httpResponse.getRequestTimeMs(started)).toBeLessThan(started + 10);
  });

  it("Get a 501 Internal Server Error when a check is not configuration properly.", () => {
    const responseObject = httpResponse.configurationError(
      interfaces.names.KTH_NODE_API,
      {
        required: true
      }
    );
    expect(responseObject.statusCode).toEqual(
      httpResponse.statusCodes.INTERNAL_SERVER_ERROR
    );
  });

  it("Get information if a service is required to work for the application to work.", () => {
    const responseObject = httpResponse.failed(
      interfaces.names.KTH_NODE_API,
      { required: true },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.statusCode).toEqual(
      httpResponse.statusCodes.SERVICE_UNAVAILABLE
    );
  });

  it("Get a 'Unexpected response from service' message when check faild, and the service is required.", () => {
    const responseObject = httpResponse.failed(
      interfaces.names.KTH_NODE_API,
      { required: true },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).toContain(
      "service | Response time: 123ms | Has to work"
    );
  });

  it("Get a 'Unexpected response from service' message when check faild, and the service is not required.", () => {
    const responseObject = httpResponse.failed(
      interfaces.names.KTH_NODE_API,
      { required: false },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).toContain(
      "service | Response time: 123ms | The application can still function"
    );
  });

  it("Get a 'Unable to connect' message when check gets an unexpected error, and the service is not required.", () => {
    const responseObject = httpResponse.error(
      interfaces.names.KTH_NODE_API,
      { required: false },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).toContain(
      "Unable to connect to the service"
    );
  });

  it("Get a 'Unable to connect' message when check gets an unexpected error, and the service is required.", () => {
    const responseObject = httpResponse.error(
      interfaces.names.KTH_NODE_API,
      { required: true },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).toContain(
      "Unable to connect to the service. The service is probably down or it is a networking issue | Response time: 123ms | Has to work "
    );
  });

  it("Get a 'Configuration error' message when unable to check status due to configuration error in the application, and the service is required.", () => {
    const responseObject = httpResponse.configurationError(
      interfaces.names.KTH_NODE_API,
      { required: true },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).toContain(
      "Configuration error | Has to work for the APPLICATION_STATUS to say OK"
    );
  });

  it("Get a 'Configuration error' message when unable to check status due to configuration error in the application, and the service is not required.", () => {
    const responseObject = httpResponse.configurationError(
      interfaces.names.KTH_NODE_API,
      { required: false },
      httpResponse.getRequestTimeMs(Date.now() - 123)
    );
    expect(responseObject.message).toContain(
      "The application can still function without this service"
    );
  });
});
