require('../testingbase');
jest.mock('../clients/redisClient')
jest.mock('../clients/emailClient')
jest.mock('node-telegram-bot-api')
const redis = require('../clients/redisClient');
const email = require('../clients/emailClient');
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

    it('should take conversation by volunteer', async (done) => {
        const volunteerId = 141516
        const userId = 'DEFGHIJKLMN'
        let assinedTheUser = addedToPendingUsers = false
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId,
                    status: assinedTheUser ? 'INCONVERSATION': 'AVAILABLE',
                    assignedUser: assinedTheUser ? userId : null
                }
            } else if (key.includes('pendingusers')) {
                return [userId]
            } else if (key.includes('ROOM') && key.includes(userId)) {
                if (assinedTheUser && addedToPendingUsers) {
                    done()
                }
            } else if (key.includes(userId)) {
                return {
                    id: userId,
                    status: assinedTheUser ? 'INCONVERSATION' : 'CREATED',
                    assginedVolunteer: assinedTheUser ? volunteerId : null,
                    pendingMessages: []
                }
            }
        });
        redis.set.mockImplementation((key, val) => {
            if (key.includes('USER') && key.includes(userId)) {
                assinedTheUser = true
            }if (key.includes('pendingusers')) {
                addedToPendingUsers = true
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/take_conversation")
    });

    it('should not take conversation by volunteer since he is assigned to user', async (done) => {
        const volunteerId = 8910111
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId,
                    status: 'INCONVERSATION'
                }
            } else if (key.includes('pendingusers')) {
                done.fail(new Error('Should not try to get pending users'))
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/take_conversation")
        done();
    });

    it('should not take conversation by volunteer since no pending users', async (done) => {
        const volunteerId = 9101112
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId,
                    status: 'AVAILABLE'
                }
            } else if (key.includes('pendingusers')) {
                return []
            } else if (key.includes('USER')) {
                done.fail(new Error('Should not try to get user'))
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/take_conversation")
        done();
    });

    it('should end conversation by volunteer', async (done) => {
        const volunteerId = 121314
        const userId = 'ABCDEFGHIJK'
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId,
                    status: 'INCONVERSATION',
                    assignedUser: userId
                }
            } else if (key.includes('pendingusers')) {
                return []
            } else if (key.includes('ROOM')) {
                return null
            } else if (key.includes(userId)) {
                return {
                    id: userId,
                    status: 'INCONVERSATION'
                }
            }
        });
        email.send.mockImplementation((id) => {
            if (id.includes(userId)) {
                done();
            }
        })
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/end_conversation")
    });

    it('should fail to end conversation by volunteer since he is not assigned', async (done) => {
        const volunteerId = 131415
        const userId = 'BCDEFGHIJKL'
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId,
                    status: 'AVAILABLE',
                    assignedUser: null
                }
            } else if (key.includes('pendingusers')) {
                return []
            } else if (key.includes('ROOM')) {
                return null
            } else if (key.includes(userId)) {
                return {
                    id: userId,
                    status: 'INCONVERSATION'
                }
            }
        });
        email.send.mockImplementation(() => {
            done.fail(new Error('Should not try to send email'))
        })
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/end_conversation")
        done()
    });

    it('should get pending users', async (done) => {
        const volunteerId = 111213
        redis.get.mockImplementation((key) => {
            if (key.includes('registeredvol')) {
                return [volunteerId]
            } else if (key.includes(volunteerId)) {
                return {
                    id: volunteerId,
                }
            } else if (key.includes('pendingusers')) {
                done();
            }
        });
        await volunteerMsgHandler.newMsg(volunteerId, "Somename", "/get_pending_users")
    });
})