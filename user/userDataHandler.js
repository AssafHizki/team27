const redis = require('../clients/redisClient');
const log = require('../clients/loggerClient').log;

const userDbVersion = '25'
const STATUS_CREATED = 'CREATED'
const STATUS_IN_CONVERSATION = 'INCONVERSATION'
const STATUS_ENDED = 'ENDED'

const getUserKey = (id) => `user:${userDbVersion}:${id}`.toUpperCase()

const createUserObject = (safeData) => {
    return {
        id: safeData.id,
        name: safeData.name,
        pendingMessages: [],
        status: STATUS_CREATED,
        createdTimestamp: Date.now(),
        asssginedVolunteer: null,
    }
}

const createUser = async (safeData) => {
    const userObject = createUserObject(safeData)
    const userKey = getUserKey(safeData.id)
    await redis.set(userKey, userObject)
}

const isCreated = (status) => {
    return status == STATUS_CREATED;
}

const addToPendingMessages = async (safeData) => {
    const userKey = getUserKey(safeData.id)
    let userObject = await redis.get(userKey)
    userObject.pendingMessages.push(safeData.text)
    await redis.set(userKey, userObject)
}

const getUserById = async (id) => {
    const userKey = getUserKey(id)
    return await redis.get(userKey)
}

const assignVolunteerToUser = async (userId, volunteerId) => {
    const userKey = getUserKey(userId)
    let userObject = await redis.get(userKey)
    userObject.status = STATUS_IN_CONVERSATION
    userObject.asssginedVolunteer = volunteerId
    await redis.set(userKey, userObject)
}

const setConversationEnded = async (id) => {
    const userKey = getUserKey(id)
    let userObject = await redis.get(userKey)
    userObject.status = STATUS_ENDED
    userObject.asssginedVolunteer = null
    await redis.set(userKey, userObject)
}

const getExistingUser = async (id) => {
    const userKey = getUserKey(id)
    return await redis.get(userKey)
}

const findAssingedVolunteerId = async (userId) => {
    try {
        const userKey = getUserKey(userId)
        const userObject = await redis.get(userKey)
        return userObject.asssginedVolunteer;
    } catch (error) {
        log(`No assingned volunteer to user ${userId}`, level = 'ERROR')
        return false
    }
}

const clearPendingMessages = async (userId) => {
    const userKey = getUserKey(userId)
    let userObject = await redis.get(userKey)
    userObject.pendingMessages = []
    await redis.set(userKey, userObject)
}

const unassignVolunteerToUser = async (userId, volunteerId) => {
    const userKey = getUserKey(userId)
    let userObject = await redis.get(userKey)
    userObject.status = STATUS_ENDED
    userObject.asssginedVolunteer = null
    await redis.set(userKey, userObject)
}

const getUserFriendlyId = (id) => {
    return `# ${id.substr(-8,2).toUpperCase().replace('_','Y').replace('-','Z')}`
}

module.exports = {
    createUser: createUser,
    isCreated: isCreated,
    addToPendingMessages: addToPendingMessages,
    getUserById: getUserById,
    assignVolunteerToUser: assignVolunteerToUser,
    setConversationEnded: setConversationEnded,
    getExistingUser: getExistingUser,
    findAssingedVolunteerId: findAssingedVolunteerId,
    clearPendingMessages: clearPendingMessages,
    unassignVolunteerToUser: unassignVolunteerToUser,
    getUserFriendlyId: getUserFriendlyId,
}