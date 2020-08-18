require('../testingbase');
jest.mock('../clients/redisClient')
jest.mock('node-telegram-bot-api')
const redis = require('../clients/redisClient');
const volunteerMsgHandler = require('./volunteerMsgHandler');

describe('Volunteer message handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    })
    it('should register a new volunteer', async (done) => {
        const volunteerId = 123456
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
        const volunteerId = 234567
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
        const volunteerId = 456790
        const anotherVolunteerId = 5678901
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId, anotherVolunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId
                }
            } else if (key.includes(anotherVolunteerId)) {
                done()
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/get_registered")
    });

    it('should not return registered volunteers to a not registered volunteer', async (done) => {
        const volunteerId = 456790
        const anotherVolunteerId = 5678901
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [anotherVolunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId
                }
            } else if (key.includes(anotherVolunteerId)) {
                done.fail(new Error('Should not try to get another volunteer data'))
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/get_registered")
        done();
    });

    it('should unregister volunteer', async (done) => {
        const volunteerId = 7890123
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId,
                    status: 'AVAILABLE'
                }
            }
        });        
        redis.set.mockImplementation((key, val) => {
            if (key.includes('registeredvol') && val.length == 0) {
                done();
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/unregister")
    });

    it.skip('should take conversation by volunteer', async (done) => {
        // volunteerDataHandler.notifyAllAvailable
        // volunteerDataHandler.sendMessageToVolunteer
        // sendStartChatToUser
        // historyHandler.setVolunteerStarted
        done.fail(new Error('Not implemented'))
    });

    it.skip('should not take conversation by volunteer since he is assigned to user', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should not take conversation by volunteer since no pending users', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should end conversation by volunteer', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should fail to end conversation by volunteer since he is not assigned', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should get pending users', async (done) => {
        done.fail(new Error('Not implemented'))
    });
})