process.env['CLIENT'] = 'test'

jest.mock('./clients/redisClient', () => ({
    get: jest.fn((key) => {
        if (key.includes('registeredvol')) {
            return []
        }
        return {
            id: key.split(':')[2],
            name: 'somename',
            status: 'AVAILABLE',
            asssginedUser: null
        }
    })
}))

jest.mock('logzio-nodejs', () => ({
    createLogger: jest.fn(() => {}),
    log: jest.fn(() => {})
}))