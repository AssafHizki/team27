const redis = require('../clients/redisClient');
const bot = require('../clients/telegramClient').getBot();
const log = require('../clients/loggerClient').log;
const env = require('../environment/environment').env();

const volunteerDbVersion = '25'

const STATUS_IN_CONVERSATION = 'INCONVERSATION'
const STATUS_AVAILABLE = 'AVAILABLE'

const volunteers = env.VOLUNTEERS

const getVolunteerName = (id) => volunteers.find(x => x.id == id).name

const createVolunteerObject = (id, name) => {
    return {
        id: id,
        name: name,
        status: STATUS_AVAILABLE,
        asssginedUser: null,
    }
}

const getVolunteerKey = (id) => `volunteer:${volunteerDbVersion}:${id}`.toUpperCase()
const getPendingUsersKey = () => `pendingusers:${volunteerDbVersion}`

const notifyAllNewUser = async () => {
    volunteers.forEach(async volunteer => {
        let volunteerObject = await getOrCreateVolunteerById(volunteer.id)
        if (volunteerObject.status == STATUS_AVAILABLE) {
            const msg = `New caller is waiting for assistance.\nSend any message to start the conversation.`
            await bot.sendMessage(volunteerObject.id, msg);
        }
    });
}

const notifyAllAvailable = async (text) => {
    volunteers.forEach(async volunteer => {
        const volunteerKey = getVolunteerKey(volunteer.id)
        const volunteerObject = redis.get(volunteerKey)
        if (volunteerObject.status == STATUS_AVAILABLE) {
            await bot.sendMessage(volunteerObject.id, text);
        }
    });
}

const sendMessageToVolunteer = async (id, text) => {
    await bot.sendMessage(id, text);
}

const addToPendingUsers = async (safeData) =>{
    const key = getPendingUsersKey()
    let pendingUsers = await redis.get(key)
    if (!pendingUsers) {
        pendingUsers = [];
    }
    pendingUsers.push(safeData.id);
    await redis.set(key, pendingUsers)
}

const getPendingUsers = async () => {
    const key = getPendingUsersKey()
    return await redis.get(key) || []
}

const clearPendingUsers = async () => {
    const key = getPendingUsersKey()
    await redis.set(key, [])
}

const clearVolunteers = async () => {
    volunteers.forEach(async volunteer => {
        const volunteerKey = getVolunteerKey(volunteer.id)
        let volunteerObject = await getOrCreateVolunteerById(volunteer.id)
        volunteerObject.status = STATUS_AVAILABLE
        volunteerObject.asssginedUser = null
        await redis.set(volunteerKey, volunteerObject)
    });
}

const getOrCreateVolunteerById = async (id) =>{
    const volunteerKey = getVolunteerKey(id)
    let volunteerObject = await redis.get(volunteerKey)
    if (!volunteerObject) {
        const vName = getVolunteerName(id)
        if (!vName) {
            log(`Can not find volunteer name ${id}`, level='WARNING')
        }
        volunteerObject = createVolunteerObject(id, vName)
    }
    await redis.set(volunteerKey, volunteerObject)
    return volunteerObject;
}

const assignUserToVolunteer = async (volunteerId, userId) => {
    let volunteerObject = await getOrCreateVolunteerById(volunteerId)
    const volunteerKey = getVolunteerKey(volunteerId)
    volunteerObject.status = STATUS_IN_CONVERSATION
    volunteerObject.asssginedUser = userId
    await redis.set(volunteerKey, volunteerObject)
}

const unassignVolunteer = async (volunteerId) => {
    const volunteerKey = getVolunteerKey(volunteerId)
    let volunteerObject = await redis.get(volunteerKey)
    volunteerObject.status = STATUS_AVAILABLE
    volunteerObject.asssginedUser = null
    await redis.set(volunteerKey, volunteerObject)
}

const isAssignedToUser = (volunteer) => {
    return volunteer.status != STATUS_AVAILABLE
}

const sendUserPendingMessagesToVolunteer = async (id, messages) => {
    messages.forEach(async (message) => {
        await bot.sendMessage(id, message);
    });
}

module.exports = {
    notifyAllNewUser: notifyAllNewUser,
    sendMessageToVolunteer: sendMessageToVolunteer,
    addToPendingUsers: addToPendingUsers,
    getPendingUsers: getPendingUsers,
    assignUserToVolunteer: assignUserToVolunteer,
    notifyAllAvailable: notifyAllAvailable,
    unassignVolunteer: unassignVolunteer,
    getOrCreateVolunteerById: getOrCreateVolunteerById,
    isAssignedToUser: isAssignedToUser,
    sendUserPendingMessagesToVolunteer,
    clearPendingUsers: clearPendingUsers,
    clearVolunteers: clearVolunteers,
}
