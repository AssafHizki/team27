const log = require('../clients/loggerClient').log;
const redis = require('../clients/redisClient');
const bot = require('../clients/telegramClient').getBot();
const env = require('../environment/environment').env();
const userDataHandler = require('../user/userDataHandler');

const volunteerDbVersion = '25'

const STATUS_IN_CONVERSATION = 'INCONVERSATION'
const STATUS_AVAILABLE = 'AVAILABLE'

const COMMAND_END_CONVERSATION = 'END_CONVERSATION'
const COMMAND_TAKE_CONVERSATION = 'TAKE_CONVERSATION'
const COMMAND_GET_PENDING_USERS = 'GET_PENDING_USERS'
const COMMAND_ON_SHIFT = 'ON_SHIFT'
const COMMAND_OFF_SHIFT = 'OFF_SHIFT'
const COMMAND_GET_SHIFT = 'GET_SHIFT'


const volunteers = env.VOLUNTEERS

const getVolunteerName = (id) => volunteers.find(x => x.id == id).name

const createVolunteerObject = (id, name) => {
    return {
        id: id,
        name: name,
        status: STATUS_AVAILABLE,
        asssginedUser: null
    }
}

const getVolunteerKey = (id) => `volunteer:${volunteerDbVersion}:${id}`.toUpperCase()
const getPendingUsersKey = () => `pendingusers:${volunteerDbVersion}`
const getOnShiftKey = () => `onshift:${volunteerDbVersion}`

const notifyAllNewUser = async (id) => {
    volunteers.forEach(async volunteer => {
        let volunteerObject = await getOrCreateVolunteerById(volunteer.id)
        const onShift = await isOnShift(volunteerObject.id)
        const available = volunteerObject.status == STATUS_AVAILABLE
        if (onShift && available) {
            const userFriendlyId = userDataHandler.getUserFriendlyId(id)
            const msg = `Visitor ${userFriendlyId} is waiting for assistance.\nSend any message to start the conversation.`
            await sendMessageToVolunteer(volunteerObject.id, msg);
        }
    });
}

const notifyAllAvailable = async (text) => {
    volunteers.forEach(async volunteer => {
        const onShift = isOnShift(volunteer.id)
        if (onShift) {
            const volunteerKey = getVolunteerKey(volunteer.id)
            const volunteerObject = await redis.get(volunteerKey)
            if (volunteerObject.status == STATUS_AVAILABLE) {
                await sendMessageToVolunteer(volunteerObject.id, text);
            }
        }
    });
}

const sendMessageToVolunteer = async (id, text, isSystem = true) => {
    if (isSystem) {
        const parse_mode = 'Markdown';
        await bot.sendMessage(id, `*== System: ==*\n${text}`, { parse_mode });
    } else {
        await bot.sendMessage(id, text);
    }
}

const addToPendingUsers = async (safeData) => {
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

const getOrCreateVolunteerById = async (id) => {
    const volunteerKey = getVolunteerKey(id)
    let volunteerObject = await redis.get(volunteerKey)
    if (!volunteerObject) {
        const vName = getVolunteerName(id)
        if (!vName) {
            log(`Can not find volunteer name ${id}`, level = 'WARNING')
            return null
        }
        volunteerObject = createVolunteerObject(id, vName)
        await redis.set(volunteerKey, volunteerObject)
    }
    return volunteerObject;
}

const assignUserToVolunteer = async (volunteerId, userId) => {
    let volunteerObject = await getOrCreateVolunteerById(volunteerId)
    const volunteerKey = getVolunteerKey(volunteerId)
    if (volunteerObject.asssginedUser) {
        log(`Volunteer already have assigned user ${volunteerId}-${volunteerObject.asssginedUser}`, level = 'WARNING')
    }
    volunteerObject.status = STATUS_IN_CONVERSATION
    volunteerObject.asssginedUser = userId
    await redis.set(volunteerKey, volunteerObject)
}

const unassignUserToVolunteer = async (volunteerId) => {
    let volunteerObject = await getOrCreateVolunteerById(volunteerId)
    const volunteerKey = getVolunteerKey(volunteerId)
    if (!volunteerObject.asssginedUser) {
        log(`Volunteer not assigned to any user ${volunteerId}-${volunteerObject.asssginedUser}`, level = 'WARNING')
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
        await sendMessageToVolunteer(id, message);
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
const isOnShift = async (id) => {
    const onShift = await getOnShiftVolunteers()
    return onShift.indexOf(id.toString()) >= 0 || onShift.indexOf(id) >= 0
}

const getOnShiftVolunteers = async () => {
    const key = getOnShiftKey()
    return await redis.get(key) || []
}

const getOnShiftVolunteersByNames = async () => {
    const ids = await getOnShiftVolunteers()
    return ids.map(x => getVolunteerName(x))
}

const goOnShift = async (id) => {
    const key = getOnShiftKey()
    let onShift = await redis.get(key) || []
    onShift.push(id)
    onShift = [...new Set(onShift)]
    await redis.set(key, onShift)
}

const goOffShift = async (id) => {
    const key = getOnShiftKey()
    let onShift = await redis.get(key) || []
    const index = onShift.indexOf(id);
    if (index > -1) {
        onShift.splice(index, 1);
        await redis.set(key, onShift)
    }
}

const getCommandFromMsg = (msg) => {
    if (msg == '/end_conversation') {
        return COMMAND_END_CONVERSATION
    }
    if (msg == '/take_conversation') {
        return COMMAND_TAKE_CONVERSATION
    }
    if (msg == '/get_pending_users') {
        return COMMAND_GET_PENDING_USERS
    }
    if (msg == '/go_on_shift') {
        return COMMAND_ON_SHIFT
    }
    if (msg == '/go_off_shift') {
        return COMMAND_OFF_SHIFT
    }
    if (msg == '/get_shift') {
        return COMMAND_GET_SHIFT
    }
    return null
}

const isEndCommand = (command) => {
    return command == COMMAND_END_CONVERSATION
}

const isTakeCommand = (command) => {
    return command == COMMAND_TAKE_CONVERSATION
}

const isGetPendingUsersCommand = (command) => {
    return command == COMMAND_GET_PENDING_USERS
}

const isOnShiftCommand = (command) => {
    return command == COMMAND_ON_SHIFT
}

const isOffShiftCommand = (command) => {
    return command == COMMAND_OFF_SHIFT
}

const isGetShiftCommand = (command) => {
    return command == COMMAND_GET_SHIFT
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
    isGetPendingUsersCommand: isGetPendingUsersCommand,
    isOnShiftCommand: isOnShiftCommand,
    isOffShiftCommand: isOffShiftCommand,
    isGetShiftCommand: isGetShiftCommand,
    isOnShift: isOnShift,
    getOnShiftVolunteers: getOnShiftVolunteers,
    getOnShiftVolunteersByNames: getOnShiftVolunteersByNames,
    goOnShift: goOnShift,
    goOffShift: goOffShift,
}
