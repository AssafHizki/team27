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

    it('should not register volunteer with wrong secret', async (done) => {
        const volunteerId = 2345
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/register wrongpasscode1234")
        expect(redis.set).not.toHaveBeenCalled();
        done();
    });

    it('should return registered volunteers to a registered volunteer', async (done) => {
        const volunteerId = 3456
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            } else if (key.includes(volunteerId)) {
                done();
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/get_registered")
    });

    // it('should not return registered volunteers to a not registered volunteer', async (done) => {
    //     const volunteerId = 3456
    //     redis.get.mockImplementation((key) => {
    //         if (key.includes('registeredvol')) {
    //             return []
    //         } else if (key.includes(volunteerId)) {
    //             // expect(true).toBe(false)
    //             console.log("dasada")
    //         }
    //     });
    //     await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/get_registered")
    //     done();
    // });
})