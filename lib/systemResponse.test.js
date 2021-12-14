'use strict'

// eslint-disable-next-line no-console
console.log = jest.fn()

const systemResponse = require('./systemResponse')

const httpResponse = require('./httpResponse')

const KTH_NODE_MONGODB = 'kth-node-mongodb'

describe('System Response', () => {
  it('Get a 501 Internal Server Error when a check is not configuration properly.', () => {
    const responseObject = httpResponse.configurationError(KTH_NODE_MONGODB, {
      required: true,
    })
    expect(responseObject.statusCode).toEqual(httpResponse.statusCodes.INTERNAL_SERVER_ERROR)
  })

  it('Get a OK message when check worked, and required.', () => {
    const responseObject = systemResponse.works(KTH_NODE_MONGODB, {
      required: true,
    })
    expect(responseObject.message).toContain('OK | Required to work: true')
  })

  it('Get a OK message when check worked, and not required.', () => {
    const responseObject = systemResponse.works(KTH_NODE_MONGODB, {
      required: false,
    })
    expect(responseObject.message).toContain('OK | Required to work: false')
  })

  it("Get a 'The application can still function' message when check faild, and required.", () => {
    const responseObject = systemResponse.failed(KTH_NODE_MONGODB, {
      required: true,
    })
    expect(responseObject.message).toContain('Error | This service has to work')
  })

  it("Get a 'The application can still function' message when check faild, and not required.", () => {
    const responseObject = systemResponse.failed(KTH_NODE_MONGODB, {
      required: false,
    })
    expect(responseObject.message).toContain('Error | The application can still function')
  })

  it('Get information if a service is required to work for the application to work.', () => {
    const responseObject = systemResponse.failed(KTH_NODE_MONGODB, {
      required: true,
    })
    expect(responseObject.statusCode).toEqual(httpResponse.statusCodes.SERVICE_UNAVAILABLE)
  })
})
