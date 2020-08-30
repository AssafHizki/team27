process.env['CLIENT'] = 'test'

jest.mock('logzio-nodejs', () => ({
    createLogger: jest.fn(() => {
        return {
            log: jest.fn(() => {})
        }
    })
}))

jest.mock('axios', () => ({
    post: jest.fn(() => {})
}))
