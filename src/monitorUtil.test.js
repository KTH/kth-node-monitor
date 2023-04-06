jest.mock('./subSystems')
const { filterSystems, checkSystems } = require('./subSystems')

filterSystems.mockReturnValue([])
checkSystems.mockResolvedValue([])

const monitorSystems = require('./monitorUtil')

const mockPlainReq = { headers: {}, query: {} }
const mockJsonReq = { headers: { accept: 'application/json' }, query: {} }
const mockRes = {
  status: jest.fn(() => mockRes),
  type: jest.fn(() => mockRes),
  send: jest.fn(() => mockRes),
  json: jest.fn(() => mockRes),
}

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
    expect(mockRes.send).toBeCalledWith(expect.stringMatching(/^APPLICATION_STATUS/))
  })
  it('Returns application status as json', async () => {
    await monitorSystems(mockJsonReq, mockRes)
    expect(mockRes.json).toBeCalledWith(expect.objectContaining({ message: expect.any(String) }))
  })

  describe('Detects response status', () => {
    describe('On plain request', () => {
      beforeEach(() => {
        checkSystems.mockResolvedValue([])
      })
      it('Successfull response if no systems are checked', async () => {
        checkSystems.mockResolvedValue([])

        await monitorSystems(mockPlainReq, mockRes)

        expect(mockRes.status).toBeCalledWith(200)
        expect(mockRes.send).toBeCalledWith(expect.stringMatching(/^APPLICATION_STATUS: OK/))
      })
      it('Successfull response if all checks are ok', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
        ])

        await monitorSystems(mockPlainReq, mockRes)

        expect(mockRes.status).toBeCalledWith(200)
        expect(mockRes.send).toBeCalledWith(expect.stringMatching(/^APPLICATION_STATUS: OK/))
      })
      it('Unsuccessfull response if any checks are not ok', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: false } },
        ])

        await monitorSystems(mockPlainReq, mockRes)

        expect(mockRes.status).toBeCalledWith(503)
        expect(mockRes.send).toBeCalledWith(expect.stringMatching(/^APPLICATION_STATUS: ERROR/))
      })
    })
    describe('On json request', () => {
      beforeEach(() => {
        checkSystems.mockResolvedValue([])
      })
      it('Successfull response if no systems are checked', async () => {
        checkSystems.mockResolvedValue([])

        await monitorSystems(mockJsonReq, mockRes)

        expect(mockRes.status).toBeCalledWith(200)
        expect(mockRes.json).toBeCalledWith(expect.objectContaining({ message: 'OK' }))
      })
      it('Successfull response if all checks are ok', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
        ])

        await monitorSystems(mockJsonReq, mockRes)

        expect(mockRes.status).toBeCalledWith(200)
        expect(mockRes.json).toBeCalledWith(expect.objectContaining({ message: 'OK' }))
      })
      it('Unsuccessfull response if any checks are not ok', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: false } },
        ])

        await monitorSystems(mockJsonReq, mockRes)

        expect(mockRes.status).toBeCalledWith(503)
        expect(mockRes.json).toBeCalledWith(expect.objectContaining({ message: 'ERROR' }))
      })
      it('Do not count ignored systems when calculating success', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
          { key: 'system3', ignored: true },
        ])

        await monitorSystems(mockJsonReq, mockRes)

        expect(mockRes.status).toBeCalledWith(200)
      })
      it('Do not count ignored systems when calculating failure', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: false } },
          { key: 'system3', ignored: true },
        ])

        await monitorSystems(mockJsonReq, mockRes)

        expect(mockRes.status).toBeCalledWith(503)
      })
      it('Count any missing result as failure', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
          { key: 'system3', result: undefined },
        ])

        await monitorSystems(mockJsonReq, mockRes)

        expect(mockRes.status).toBeCalledWith(503)
      })
    })
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
    it('Selects first param if multiple are supplied', async () => {
      const req = { headers: { accept: 'application/json' }, query: { probe: ['readyness', 'liveness'] } }
      await monitorSystems(req, mockRes, systemList)
      expect(filterSystems).toBeCalledWith('readyness', systemList)
    })
  })
})
