jest.mock('./subSystems')
const { filterSystems, checkSystems } = require('./subSystems')

filterSystems.mockReturnValue([])
checkSystems.mockResolvedValue([])

const { monitorRequest } = require('./monitorUtil')

const mockPlainReq = { headers: {}, query: {} }
const mockJsonReq = { headers: { accept: 'application/json' }, query: {} }
const mockRes = {
  status: jest.fn(() => mockRes),
  type: jest.fn(() => mockRes),
  send: jest.fn(() => mockRes),
  json: jest.fn(() => mockRes),
  set: jest.fn(() => mockRes),
}

describe('Monitor', () => {
  it('Returns plain text on default', async () => {
    await monitorRequest(mockPlainReq, mockRes)
    expect(mockRes.type).toHaveBeenCalledWith('text')
  })
  it('Optionaly returns json', async () => {
    await monitorRequest(mockJsonReq, mockRes)
    expect(mockRes.json).toHaveBeenCalled()
  })
  it('Returns application status as text', async () => {
    await monitorRequest(mockPlainReq, mockRes)
    expect(mockRes.send).toHaveBeenCalledWith(expect.stringMatching(/^APPLICATION_STATUS/))
  })
  it('Returns application status as json', async () => {
    await monitorRequest(mockJsonReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }))
  })

  describe('Detects response status', () => {
    describe('On plain request', () => {
      it('Successfull response if no systems are checked', async () => {
        checkSystems.mockResolvedValue([])

        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.send).toHaveBeenCalledWith(expect.stringMatching(/^APPLICATION_STATUS: OK/))
      })
      it('Successfull response if all checks are ok', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
        ])

        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.send).toHaveBeenCalledWith(expect.stringMatching(/^APPLICATION_STATUS: OK/))
      })
      it('Unsuccessfull response if any checks are not ok', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: false } },
        ])

        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(503)
        expect(mockRes.send).toHaveBeenCalledWith(expect.stringMatching(/^APPLICATION_STATUS: ERROR/))
      })
    })
    describe('On json request', () => {
      it('Successfull response if no systems are checked', async () => {
        checkSystems.mockResolvedValue([])

        await monitorRequest(mockJsonReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'OK' }))
      })
      it('Successfull response if all checks are ok', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
        ])

        await monitorRequest(mockJsonReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'OK' }))
      })
      it('Unsuccessfull response if any checks are not ok', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: false } },
        ])

        await monitorRequest(mockJsonReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(503)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'ERROR' }))
      })
      it('Do not count ignored systems when calculating success', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
          { key: 'system3', ignored: true },
        ])

        await monitorRequest(mockJsonReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
      })
      it('Do not count ignored systems when calculating failure', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: false } },
          { key: 'system3', ignored: true },
        ])

        await monitorRequest(mockJsonReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(503)
      })
      it('Count any missing result as failure', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
          { key: 'system3', result: undefined },
        ])

        await monitorRequest(mockJsonReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(503)
      })
    })
  })

  describe('Detects probe type', () => {
    const systemList = [{ key: 'some_system' }, { key: 'some_other_system' }]
    test('When query contains probe=liveness', async () => {
      const req = { headers: { accept: 'application/json' }, query: { probe: 'liveness' } }
      await monitorRequest(req, mockRes, systemList)
      expect(filterSystems).toHaveBeenCalledWith('liveness', systemList)
    })
    test('When query contains probe=readyness', async () => {
      const req = { headers: { accept: 'application/json' }, query: { probe: 'readyness' } }
      await monitorRequest(req, mockRes, systemList)

      expect(filterSystems).toHaveBeenCalledWith('readyness', systemList)
    })
    test('When query params contain uppercase', async () => {
      const req = { headers: { accept: 'application/json' }, query: { PrObe: 'READYness' } }
      await monitorRequest(req, mockRes, systemList)
      expect(filterSystems).toHaveBeenCalledWith('readyness', systemList)
    })
    it('Uses liveness when probe param is empty', async () => {
      const req = { headers: { accept: 'application/json' }, query: { probe: undefined } }
      await monitorRequest(req, mockRes, systemList)
      expect(filterSystems).toHaveBeenCalledWith('liveness', systemList)
    })
    it('Uses liveness when probe param is missing', async () => {
      const req = { headers: { accept: 'application/json' }, query: {} }
      await monitorRequest(req, mockRes, systemList)
      expect(filterSystems).toHaveBeenCalledWith('liveness', systemList)
    })
    it('Uses liveness when query object is missing', async () => {
      const req = { headers: { accept: 'application/json' } }
      await monitorRequest(req, mockRes, systemList)
      expect(filterSystems).toHaveBeenCalledWith('liveness', systemList)
    })
    it('Selects first param if multiple are supplied', async () => {
      const req = { headers: { accept: 'application/json' }, query: { probe: ['readyness', 'liveness'] } }
      await monitorRequest(req, mockRes, systemList)
      expect(filterSystems).toHaveBeenCalledWith('readyness', systemList)
    })
  })

  describe('Format results', () => {
    describe('Json', () => {
      it('adds one subSystem entry for each system', async () => {
        let result
        mockRes.json.mockImplementation(json => {
          result = json
        })
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
        ])
        await monitorRequest(mockJsonReq, mockRes)

        expect(result.subSystems).toHaveLength(2)
        expect(result.subSystems).toEqual(
          expect.arrayContaining([expect.objectContaining({ key: 'system1', name: 'system1' })])
        )
        expect(result.subSystems).toEqual(
          expect.arrayContaining([expect.objectContaining({ key: 'system2', name: 'system2' })])
        )
      })
      it('keeps selected fields', async () => {
        let result
        mockRes.json.mockImplementation(json => {
          result = json
        })
        checkSystems.mockResolvedValue([{ key: 'system1', result: { status: true }, ignored: false, required: true }])
        await monitorRequest(mockJsonReq, mockRes)

        expect(result.subSystems[0]).toEqual(expect.objectContaining({ key: expect.anything() }))
        expect(result.subSystems[0]).toEqual(expect.objectContaining({ name: result.subSystems[0].key }))
        expect(result.subSystems[0]).toEqual(expect.objectContaining({ result: expect.anything() }))
        expect(result.subSystems[0]).toEqual(expect.objectContaining({ ignored: expect.anything() }))
        expect(result.subSystems[0]).toEqual(expect.objectContaining({ required: expect.anything() }))
      })
      it('ignores other fields', async () => {
        let result
        mockRes.json.mockImplementation(json => {
          result = json
        })
        checkSystems.mockResolvedValue([{ key: 'system1', delete_me: 'garbage data', ignore_me: { data: 'garbage' } }])
        await monitorRequest(mockJsonReq, mockRes)

        expect(result.subSystems[0]).toEqual(expect.objectContaining({ key: expect.anything() }))
        expect(result.subSystems[0]).toEqual(expect.objectContaining({ name: expect.anything() }))
        expect(result.subSystems[0]).not.toEqual(expect.objectContaining({ delete_me: expect.anything() }))
        expect(result.subSystems[0]).not.toEqual(expect.objectContaining({ ignore_me: expect.anything() }))
      })
      it('prints successfull json', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true }, ignored: false, required: true, deleteMe: 'garbage data' },
        ])
        await monitorRequest(mockJsonReq, mockRes)

        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'OK',
          subSystems: [{ key: 'system1', name: 'system1', result: { status: true }, ignored: false, required: true }],
        })
      })
      it('prints unsuccessfull json', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: false }, ignored: false, required: true, deleteMe: 'garbage data' },
        ])
        await monitorRequest(mockJsonReq, mockRes)

        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'ERROR',
          subSystems: [{ key: 'system1', name: 'system1', result: { status: false }, ignored: false, required: true }],
        })
      })
    })
    describe('Plain text', () => {
      it('adds each system', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
        ])
        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('system1'))
        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('system2'))
      })
      it('gives preference to name over key', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', name: 'name1', result: { status: true } },
          { key: 'system2', name: 'name2', result: { status: true } },
        ])
        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('name1'))
        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('name1'))
        expect(mockRes.send).toHaveBeenCalledWith(expect.not.stringContaining('system1'))
        expect(mockRes.send).toHaveBeenCalledWith(expect.not.stringContaining('system2'))
      })
      it('shows successfull system', async () => {
        checkSystems.mockResolvedValue([{ key: 'system1', result: { status: true }, ignored: false, required: true }])
        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('system1 - OK'))
      })
      it('shows unsuccessfull system', async () => {
        checkSystems.mockResolvedValue([{ key: 'system1', result: { status: false }, ignored: false, required: true }])
        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('system1 - ERROR'))
      })
      it('shows unsuccessfull message if it exists', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: false, message: 'Responded with 404' }, ignored: false, required: true },
        ])
        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('system1 - ERROR, Responded with 404'))
      })
      it('shows ignored system', async () => {
        checkSystems.mockResolvedValue([{ key: 'system1', result: { status: false }, ignored: true, required: true }])
        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('system1 - Ignored'))
      })
      it('shows complete successfull response', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: true } },
        ])
        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.send).toHaveBeenCalledWith(`APPLICATION_STATUS: OK
system1 - OK
system2 - OK`)
      })
      it('shows complete unsuccessfull response', async () => {
        checkSystems.mockResolvedValue([
          { key: 'system1', result: { status: true } },
          { key: 'system2', result: { status: false } },
        ])
        await monitorRequest(mockPlainReq, mockRes)

        expect(mockRes.send).toHaveBeenCalledWith(`APPLICATION_STATUS: ERROR
system1 - OK
system2 - ERROR`)
      })
    })
  })
})
