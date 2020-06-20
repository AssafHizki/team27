const logError = require('../clients/loggerClient').logError;
const logWarn = require('../clients/loggerClient').logWarn;
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
const COMMAND_REGISTER = 'REGISTER'
const COMMAND_UNREGISTER = 'UNREGISTER'
const COMMAND_GET_REGISTERED = 'GET_REGISTERED'


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

const notifyAllNewUser = async (id) => {
    volunteers.forEach(async volunteer => {
        let volunteerObject = await getVolunteerById(volunteer.id)
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
    try {
        if (isSystem) {
            const parse_mode = 'Markdown';
            await bot.sendMessage(id, `*== System: ==*\n${text}`, { parse_mode });
        } else {
            await bot.sendMessage(id, text);
        }
    } catch (error) {
        logError(`Failed to send message to volunteer ${id}. isSystem=${isSystem}`)
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
        let volunteerObject = await getVolunteerById(volunteer.id)
        volunteerObject.status = STATUS_AVAILABLE
        volunteerObject.asssginedUser = null
        await redis.set(volunteerKey, volunteerObject)
    });
}

const getVolunteerById = async (id) => {
    const volunteerKey = getVolunteerKey(id)
    return await redis.get(volunteerKey)
}

const createVolunteerById = async (id, name) => {
    const volunteerKey = getVolunteerKey(id)
    let volunteerObject = await redis.get(volunteerKey)
    if (!volunteerObject) {
        volunteerObject = createVolunteerObject(id, name)
        await redis.set(volunteerKey, volunteerObject)
    } else {
        logError(`Can not create an existing volunteer ${name}(${id})`)
    }
    return volunteerObject;
}

const assignUserToVolunteer = async (volunteerId, userId) => {
    let volunteerObject = await getVolunteerById(volunteerId)
    const volunteerKey = getVolunteerKey(volunteerId)
    if (volunteerObject.asssginedUser) {
        logWarn(`Volunteer already have assigned user ${volunteerId}-${volunteerObject.asssginedUser}`)
    }
    volunteerObject.status = STATUS_IN_CONVERSATION
    volunteerObject.asssginedUser = userId
    await redis.set(volunteerKey, volunteerObject)
}

const unassignUserToVolunteer = async (volunteerId) => {
    let volunteerObject = await getVolunteerById(volunteerId)
    const volunteerKey = getVolunteerKey(volunteerId)
    if (!volunteerObject.asssginedUser) {
        logWarn(`Volunteer not assigned to any user ${volunteerId}-${volunteerObject.asssginedUser}`)
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

const userIsTyping = async (id) => {
    await bot.sendChatAction(id, action = "typing");
}

const registerVolunteer = async (id, name, msg) => {
    const secret = msg.split('/register ')
    if (secret.length == 2 && secret[1] == env.REGISTRATION_SECRET) {
        volunteer = await createVolunteerById(id, name)
        await sendMessageToVolunteer(volunteer.id, `You are now registered`)
        logWarn(`Volunteer registered successfully: ${name}(${id})`);
        return emptySuccessMassage
    } else {
        logWarn(`Volunteer registered fail!: ${name}(${id})`);
        await sendMessageToVolunteer(id, `Failed to register`)
        return emptySuccessMassage
    }
}

const unRegisterVolunteer = async () => {
    // TODO HERE
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
    if (msg == '/register') {
        return COMMAND_REGISTER
    }
    if (msg == '/unregister') {
        return COMMAND_UNREGISTER
    }
    if (msg == '/get_registered') {
        return COMMAND_GET_REGISTERED
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

const isRegisterCommand = (command) => {
    return command == COMMAND_REGISTER
}

const isUnRegisterCommand = (command) => {
    return command == COMMAND_UNREGISTER
}

const isGetRegistered = (command) => {
    return command == COMMAND_GET_REGISTERED
}

module.exports = {
    notifyAllNewUser,
    sendMessageToVolunteer,
    addToPendingUsers,
    getPendingUsers,
    assignUserToVolunteer,
    notifyAllAvailable,
    unassignVolunteer,
    getVolunteerById,
    isAssignedToUser,
    sendUserPendingMessagesToVolunteer,
    clearPendingUsers,
    clearVolunteers,
    removeFromPendingUsers,
    getCommandFromMsg,
    isEndCommand,
    isTakeCommand,
    unassignUserToVolunteer,
    isGetPendingUsersCommand,
    isGetRegistered,
    isUnRegisterCommand,
    isRegisterCommand,
    isOnShift,
    getOnShiftVolunteers,
    getOnShiftVolunteersByNames,
    goOnShift,
    goOffShift,
    userIsTyping,
    registerVolunteer,
    unRegisterVolunteer,
}
