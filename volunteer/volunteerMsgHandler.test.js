require('../testingbase');
jest.mock('../clients/redisClient')
jest.mock('node-telegram-bot-api')
const redis = require('../clients/redisClient');
const volunteerMsgHandler = require('./volunteerMsgHandler');

describe('Volunteer message handler', () => {
    it('should register a new volunteer', async (done) => {
        const volunteerId = 1234
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return []
            }
        });
        redis.set.mockImplementation((key, value) => {
            if (key.includes('registeredvol') && value==volunteerId) {
                done();
            }
        })
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/register passcode1234")
    });
})