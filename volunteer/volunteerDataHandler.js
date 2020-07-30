const logError = require('../clients/loggerClient').logError;
const logWarn = require('../clients/loggerClient').logWarn;
const redis = require('../clients/redisClient');
const env = require('../environment/environment').env();
const userDataHandler = require('../user/userDataHandler');
const bot = require('../clients/telegramClient').getBot();

// let bot = null
// if (env.PLATFORM == 'SLACK') {
//     bot = require('../clients/slackClient').getBot();
// } else if (env.PLATFORM == 'TELEGRAM') {
//     bot = require('../clients/telegramClient').getBot();
// } else {
//     throw Error('PLATFORM NOT CONFIGURED'); 
//     // bot = require('../clients/slackClient').getBot();
// }


const volunteerDbVersion = '27'

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
const getRegisteredVolunteersKey = () => `registeredvol:${volunteerDbVersion}`

const notifyAllNewUser = async (id) => {
    const volunteers = await getRegisteredVolunteers()
    volunteers.forEach(async volunteer_id => {
        let volunteerObject = await getVolunteerById(volunteer_id)
        if (volunteerObject) {
            const available = volunteerObject.status == STATUS_AVAILABLE
            if (available) {
                const userFriendlyId = userDataHandler.getUserFriendlyId(id)
                const msg = `Visitor ${userFriendlyId} is waiting for assistance.\nUse take conversation command to start the conversation.`
                await sendMessageToVolunteer(volunteerObject.id, msg);
            }
        } else {
            logWarn(`notifyAllNewUser: volunteer not found ${volunteer_id}`)
        }
    });
}

const notifyAllAvailable = async (text) => {
    const volunteers = await getRegisteredVolunteers()
    volunteers.forEach(async volunteer_id => {
        const volunteerObject = await getVolunteerById(volunteer_id)
        if (volunteerObject) {
            if (volunteerObject.status == STATUS_AVAILABLE) {
                await sendMessageToVolunteer(volunteerObject.id, text);
            }
        } else {
            logWarn(`notifyAllAvailable: volunteer not found ${volunteer_id}`)
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

const isVolunteerRegistered = async (id) => {
    const volunteer = await getVolunteerById(id)
    if (volunteer) {
        const all = await getRegisteredVolunteers()
        if (all.includes(volunteer.id) || all.includes(volunteer.id.toString())) {
            return true
        }
    }
    return false
}

const getRegisteredVolunteers = async () => {
    const key = getRegisteredVolunteersKey()
    return await redis.get(key) || []
}

const getRegisteredVolunteersByNames = async () => {
    const ids = await getRegisteredVolunteers()
    let names = []
    return await Promise.all(ids.map(async id => {
        const volunteer = await getVolunteerById(id)
        return volunteer.name
    }))
}

const userIsTyping = async (id) => {
    await bot.sendChatAction(id, action = "typing");
}

const registerVolunteer = async (id, name, msg) => {
    const secret = msg.split('register ')
    if (secret.length == 2 && secret[1] == env.REGISTRATION_SECRET) {
        volunteer = await createVolunteerById(id, name)
        const key = getRegisteredVolunteersKey()
        let registered = await redis.get(key) || []
        registered.push(id)
        registered = [...new Set(registered)]
        await redis.set(key, registered)
        await sendMessageToVolunteer(volunteer.id, `You are now registered`)
        logWarn(`Volunteer registered successfully: ${name}(${id})`);
    } else {
        logWarn(`Volunteer registered fail!: ${name}(${id})`);
        await sendMessageToVolunteer(id, `Failed to register`)
    }
}

const unRegisterVolunteer = async (id, name) => {
    const key = getRegisteredVolunteersKey()
    let registered = await redis.get(key) || []
    const index = registered.indexOf(id);
    if (index > -1) {
        registered.splice(index, 1);
        await redis.set(key, registered)
    }
    const volunteer = await getVolunteerById(id)
    if (isAssignedToUser(volunteer)) {
        unassignUserToVolunteer(id)
    }
    await sendMessageToVolunteer(id, `You are now unregistered`)
    logInfo(`Volunteer is on unregistered: ${name}(${id})`);
}

const getCommandFromMsg = (msg) => {
    if (msg.startsWith('/end_conversation') || msg.startsWith('cmd_end_conversation')) {
        return COMMAND_END_CONVERSATION
    }
    if (msg.startsWith('/take_conversation') || msg.startsWith('cmd_take_conversation')) {
        return COMMAND_TAKE_CONVERSATION
    }
    if (msg.startsWith('/get_pending_users') || msg.startsWith('cmd_get_pending_users')) {
        return COMMAND_GET_PENDING_USERS
    }
    if (msg.startsWith('/register') || msg.startsWith('cmd_register')) {
        return COMMAND_REGISTER
    }
    if (msg.startsWith('/unregister') || msg.startsWith('cmd_unregister')) {
        return COMMAND_UNREGISTER
    }
    if (msg.startsWith('/get_registered') || msg.startsWith('cmd_get_registered')) {
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
    removeFromPendingUsers,
    getCommandFromMsg,
    isEndCommand,
    isTakeCommand,
    unassignUserToVolunteer,
    isGetPendingUsersCommand,
    isGetRegistered,
    isUnRegisterCommand,
    isRegisterCommand,
    userIsTyping,
    registerVolunteer,
    unRegisterVolunteer,
    getRegisteredVolunteers,
    getRegisteredVolunteersByNames,
    isVolunteerRegistered,
}
