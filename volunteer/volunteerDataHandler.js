const log = require('../clients/loggerClient').log;
const redis = require('../clients/redisClient');
const bot = require('../clients/telegramClient').getBot();
const env = require('../environment/environment').env();
const userDataHandler = require('../user/userDataHandler');

const volunteerDbVersion = '25'

const STATUS_IN_CONVERSATION = 'INCONVERSATION'
const STATUS_AVAILABLE = 'AVAILABLE'

const COMMAND_END_CONVERSATION = 'END_CONVERSATION'
const COMMAND_TAKE_CONVERSATION= 'TAKE_CONVERSATION'


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

const notifyAllNewUser = async (id) => {
    volunteers.forEach(async volunteer => {
        let volunteerObject = await getOrCreateVolunteerById(volunteer.id)
        if (volunteerObject.status == STATUS_AVAILABLE) {
            const userFriendlyId = userDataHandler.getUserFriendlyId(id)
            const msg = `Visitor ${userFriendlyId} is waiting for assistance.\nSend any message to start the conversation.`
            await bot.sendMessage(volunteerObject.id, msg);
        }
    });
}

const notifyAllAvailable = async (text) => {
    volunteers.forEach(async volunteer => {
        const volunteerKey = getVolunteerKey(volunteer.id)
        const volunteerObject = await redis.get(volunteerKey)
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
    if (volunteerObject.asssginedUser) {
        log(`Volunteer already have assigned user ${volunteerId}-${volunteerObject.asssginedUser}`, level='WARNING')
    }
    volunteerObject.status = STATUS_IN_CONVERSATION
    volunteerObject.asssginedUser = userId
    await redis.set(volunteerKey, volunteerObject)
}

const unassignUserToVolunteer = async (volunteerId) => {
    let volunteerObject = await getOrCreateVolunteerById(volunteerId)
    const volunteerKey = getVolunteerKey(volunteerId)
    if (!volunteerObject.asssginedUser) {
        log(`Volunteer not assigned to any user ${volunteerId}-${volunteerObject.asssginedUser}`, level='WARNING')
    }
    volunteerObject.status = STATUS_AVAILABLE
    volunteerObject.asssginedUser = null
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

const removeFromPendingUsers = async (userId) => {
    const key = getPendingUsersKey()
    let pendingUsers = await redis.get(key)
    if (!pendingUsers) {
        return
    }
    var index = pendingUsers.indexOf(userId);
    if (index == -1) {
        return
    }
    pendingUsers.splice(index, 1);
    await redis.set(key, pendingUsers)
}

const getCommandFromMsg = (msg) => {
    if (msg == '/end_conversation') {
        return COMMAND_END_CONVERSATION
    }
    if (msg == '/take_conversation') {
        return COMMAND_TAKE_CONVERSATION
    }
    return null
}

const isEndCommand= (command) => {
    return command == COMMAND_END_CONVERSATION
}

const isTakeCommand = (command) => {
    return command == COMMAND_TAKE_CONVERSATION
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
    removeFromPendingUsers: removeFromPendingUsers,
    getCommandFromMsg: getCommandFromMsg,
    isEndCommand: isEndCommand,
    isTakeCommand: isTakeCommand,
    unassignUserToVolunteer: unassignUserToVolunteer,
}
