require('../testingbase');
jest.mock('../clients/redisClient')
jest.mock('../clients/emailClient')
jest.mock('node-telegram-bot-api')
const redis = require('../clients/redisClient');
const email = require('../clients/emailClient');
const userMsgHandler = require('./userMsgHandler');

describe('User message handler', () => {

    afterEach(() => {
        jest.clearAllMocks();
    })

    it('should send message from user to assigned volunteer', async (done) => {
        const userId = 'FAKEABCDEFGH'
        const volunteerId = 50515253
        let roomWasSet = false
        redis.get.mockImplementation((key) => {
            if (key.includes('ROOM:USR:FAKE')) {
                roomWasSet = true
            } else if (key.includes(userId)) {
                return {
                    id: userId,
                    status:'INCONVERSATION',
                    assginedVolunteer: volunteerId,
                    pendingMessages: []
                }
            }
        });
        res = await userMsgHandler.newMsg({body: {
            userId: userId,
            text: 'sometext',
            eventType: 'text'
        }})
        expect(res.status).toEqual(200)
        expect(roomWasSet).toBe(true)
        done()
    });

    it('should not send message from user to assigned volunteer since user no exist', async (done) => {
        const userId = 'FAKEBCDEFG'
        let roomWasSet = false
        redis.get.mockImplementation((key) => {
            if (key.includes('ROOM:USR:FAKE')) {
                roomWasSet = true
            } else if (key.includes(userId)) {
                return null
            }
        });
        res = await userMsgHandler.newMsg({body: {
            userId: userId,
            text: 'sometext',
            eventType: 'text'
        }})
        expect(res.status).toEqual(400)
        expect(roomWasSet).toBe(false)
        done()
    });

    it('should not send message from user to assigned volunteer since user not assigned', async (done) => {
        const userId = 'FAKEABCDEFGH'
        let roomWasSet = false
        redis.get.mockImplementation((key) => {
            if (key.includes('ROOM:USR:FAKE')) {
                roomWasSet = true
            } else if (key.includes(userId)) {
                return {
                    id: userId,
                    status:'CREATED',
                    assginedVolunteer: null,
                    pendingMessages: []
                }
            }
        });
        res = await userMsgHandler.newMsg({body: {
            userId: userId,
            text: 'sometext',
            eventType: 'text'
        }})
        expect(res.status).toEqual(200)
        expect(roomWasSet).toBe(false)
        done()
    });

    it('should start new conversation', async (done) => {
        const userId = 'FAKECDEFGHI'
        let roomWasSet = false
        redis.set.mockImplementation((key) => {
            if (key.includes('pendingusers:27')) {
                roomWasSet = true
            }
        });
        res = await userMsgHandler.newMsg({body: {
            userId: userId,
            eventType: 'start'
        }})
        expect(res.status).toEqual(200)
        expect(roomWasSet).toBe(true)
        done()
    });

    it('should fail to start new conversation since user already exist', async (done) => {
        const userId = 'FAKEDEFGHIJKL'
        redis.get.mockImplementation((key) => {
            if (key.includes(userId)) {
                return {
                    id: userId,
                    status: 'CREATED',
                    assginedVolunteer: null,
                    pendingMessages: []
                }
            }
        });
        res = await userMsgHandler.newMsg({body: {
            userId: userId,
            eventType: 'start'
        }})
        expect(res.status).toEqual(400)
        done()
    });

    it.skip('should end existing conversation', async (done) => {
        // TODO
        const userId = 'FAKEFGHIJKLMNO'
        const volunteerId = 565758
        let roomWasSet = false
        redis.get.mockImplementation((key) => {
            if (key.includes('ROOM:USR:FAKE')) {
                roomWasSet = true
            } else if (key.includes(userId)) {
                return {
                    id: userId,
                    status:'INCONVERSATION',
                    assginedVolunteer: volunteerId,
                    pendingMessages: []
                }
            }
        });
        res = await userMsgHandler.newMsg({body: {
            userId: userId,
            eventType: 'end'
        }})
        expect(res.status).toEqual(200)
        expect(roomWasSet).toBe(true)
        done()
    });

    it.skip('should fail to end existing conversation since user not exist', async (done) => {
        done.fail(new Error('Not implemented'))
    });
    
    it.skip('should fail to end existing conversation since user not assigned (conversarion ended by volunteer)', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should fail to end existing conversation since user not assigned (conversarion not started)', async (done) => {
        done.fail(new Error('Not implemented'))
    });
})