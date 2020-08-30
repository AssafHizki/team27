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
        redis.get.mockImplementation((key) => {
            if (key.includes('ROOM:USR:FAKEABCDEFGH')) {
                done()
            } else if (key.includes(userId)) {
                return {
                    id: userId,
                    status:'INCONVERSATION',
                    assginedVolunteer: volunteerId,
                    pendingMessages: []
                }
            }
        });
        await userMsgHandler.newMsg({body: {
            userId: userId,
            text: 'sometext',
            type: 'text'
        }})
    });

    it.skip('should not send message from user to assigned volunteer since user no exist', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should not send message from user to assigned volunteer since user not assigned', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should start new conversation', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should fail to start new conversation since user already exist', async (done) => {
        done.fail(new Error('Not implemented'))
    });

    it.skip('should end existing conversation', async (done) => {
        done.fail(new Error('Not implemented'))
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