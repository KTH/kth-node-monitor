jest.mock('./subSystems')
const { filterSystems } = require('./subSystems')

filterSystems.mockReturnValue([])

const monitorSystems = require('./monitorUtil')

const mockPlainReq = { headers: {}, query: {} }
const mockJsonReq = { headers: { accept: 'application/json' }, query: {} }
const mockRes = { type: jest.fn(() => mockRes), send: jest.fn(() => mockRes), json: jest.fn(() => mockRes) }

describe('Monitor', () => {
  it('Returns plain text on default', async () => {
    await monitorSystems(mockPlainReq, mockRes)
    expect(mockRes.type).toBeCalledWith('text')
  })
  it('Optionaly returns json', async () => {
    await monitorSystems(mockJsonReq, mockRes)
    expect(mockRes.json).toBeCalled()
  })
  it('Returns application status as text', async () => {
    await monitorSystems(mockPlainReq, mockRes)
    expect(mockRes.send).toBeCalledWith(expect.stringMatching(/^APPLICATION_STATUS: OK/))
  })
  it('Returns application status as json', async () => {
    await monitorSystems(mockJsonReq, mockRes)
    expect(mockRes.json).toBeCalledWith(expect.objectContaining({ message: 'OK' }))
  })

  describe('Detects probe type', () => {
    const systemList = [{ key: 'some_system' }, { key: 'some_other_system' }]
    test('When query contains probe=liveness', async () => {
      const req = { headers: { accept: 'application/json' }, query: { probe: 'liveness' } }
      await monitorSystems(req, mockRes, systemList)
      expect(filterSystems).toBeCalledWith('liveness', systemList)
    })
    test('When query contains probe=readyness', async () => {
      const req = { headers: { accept: 'application/json' }, query: { probe: 'readyness' } }
      await monitorSystems(req, mockRes, systemList)

      expect(filterSystems).toBeCalledWith('readyness', systemList)
    })
    test('When query params contain uppercase', async () => {
      const req = { headers: { accept: 'application/json' }, query: { PrObe: 'READYness' } }
      await monitorSystems(req, mockRes, systemList)
      expect(filterSystems).toBeCalledWith('readyness', systemList)
    })
    it('Uses liveness when probe param is empty', async () => {
      const req = { headers: { accept: 'application/json' }, query: { probe: undefined } }
      await monitorSystems(req, mockRes, systemList)
      expect(filterSystems).toBeCalledWith('liveness', systemList)
    })
    it('Uses liveness when probe param is missing', async () => {
      const req = { headers: { accept: 'application/json' }, query: {} }
      await monitorSystems(req, mockRes, systemList)
      expect(filterSystems).toBeCalledWith('liveness', systemList)
    })
  })
})
