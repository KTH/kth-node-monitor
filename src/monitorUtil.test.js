const monitorSystems = require('./monitorUtil')

const mockPlainReq = { headers: {} }
const mockJsonReq = { headers: { accept: 'application/json' } }
const mockRes = { type: jest.fn(() => mockRes), send: jest.fn(() => mockRes), json: jest.fn(() => mockRes) }

describe('Monitor', () => {
  it('returns plain text on default', () => {
    monitorSystems(mockPlainReq, mockRes)
    expect(mockRes.type).toBeCalledWith('text')
  })
  it('optionaly returns json', () => {
    monitorSystems(mockJsonReq, mockRes)
    expect(mockRes.json).toBeCalled()
  })
  it('returns application status as text', () => {
    monitorSystems(mockPlainReq, mockRes)
    expect(mockRes.send).toBeCalledWith(expect.stringMatching(/^APPLICATION_STATUS: OK/))
  })
  it('returns application status as json', () => {
    monitorSystems(mockJsonReq, mockRes)
    expect(mockRes.json).toBeCalledWith(expect.objectContaining({ message: 'OK' }))
  })
})
