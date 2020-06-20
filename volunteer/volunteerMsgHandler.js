const axios = require('axios');
const logError = require('../clients/loggerClient').logError;
const logInfo = require('../clients/loggerClient').logInfo;
const logWarn = require('../clients/loggerClient').logWarn;
const logDebug = require('../clients/loggerClient').logDebug;
const volunteerDataHandler = require('./volunteerDataHandler');
const userDataHandler = require('../user/userDataHandler');
const { volunteerMessage } = require('..');
const env = require('../environment/environment').env();

const CHAT_URL = `${env.CLIENT_BASE_URL}/api/chat`

const sendStartChatToUser = async (userId, VolName) => {
    return await sendMsgToUser(userId, VolName, '', 'volStart')
}

const sendEndChatToUser = async (userId, VolName) => {
    return await sendMsgToUser(userId, VolName, '', 'volEnd')
}

const sendTypingToUser = async (userId, VolName) => {
    return await sendMsgToUser(userId, VolName, '', 'volTyping')
}

const sendMsgToUser = async (userId, VolName, text, eventType='text') => {
    try {
        logInfo(`Sending ${eventType} message to user ${userId}`)
        return await axios.post(CHAT_URL, {
            userId: userId,
            VolName: VolName,
            text: text,
            eventType: eventType
        })
    } catch (error) {
        logError(`Failed to send message to user=${userId}, type=${eventType}: error=${error}`);
    }
}

const emptySuccessMassage = {
    body: {status: 'success'},
    status: 200
}

const newMsg = async (id, name, msg) => {
    logDebug(`Volunteer: ${name}(${id}): ${msg}`);
    const command = volunteerDataHandler.getCommandFromMsg(msg)
    const isRegisterCommand = volunteerDataHandler.isRegisterCommand(command)
    if (isRegisterCommand) {
        await volunteerDataHandler.registerVolunteer(id, name, msg)
        return emptySuccessMassage
    }
    const volunteer = await volunteerDataHandler.getVolunteerById(id)
    if (!volunteer) {
        logWarn(`Volunteer not exist: ${name}(${id}): ${msg}`);
        return emptySuccessMassage
    }
    const isTakeCommand = volunteerDataHandler.isTakeCommand(command)
    const isEndCommand = volunteerDataHandler.isEndCommand(command)
    const isUnRegisterCommand = volunteerDataHandler.isUnRegisterCommand(command)
    const isGetRegistered = volunteerDataHandler.isGetRegistered(command)
    const isGetPendingUsersCommand = volunteerDataHandler.isGetPendingUsersCommand(command)
    const isAssignedToUser = volunteerDataHandler.isAssignedToUser(volunteer)
    if (!command && isAssignedToUser) {
        await sendMsgToUser(volunteer.asssginedUser, volunteer.name, msg);
    } else if (isTakeCommand) {
        if (isAssignedToUser) {
            await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `You are already in a conversation`)
            return emptySuccessMassage
        }
        const pending = await volunteerDataHandler.getPendingUsers()
        logInfo(`Pending users: ${JSON.stringify(pending)}`)
        if (pending.length == 0) {
            logInfo(`No pending users for volunteer: ${volunteer.name}`)
            return emptySuccessMassage
        }
        const userId = pending[0]
        let user = await userDataHandler.getUserById(userId)
        if (!user) {
            logError(`Can not find pending user: ${userId}`)
            return {body: {status: 'fail'},  status: 400}
        }
        await volunteerDataHandler.assignUserToVolunteer(volunteer.id, userId)
        await userDataHandler.assignVolunteerToUser(userId, volunteer.id)
        await volunteerDataHandler.removeFromPendingUsers(userId)
        await volunteerDataHandler.sendUserPendingMessagesToVolunteer(volunteer.id, user.pendingMessages)
        await userDataHandler.clearPendingMessages(userId)
        const userFriendlyId = userDataHandler.getUserFriendlyId(userId)
        await volunteerDataHandler.notifyAllAvailable(`Visitor ${userFriendlyId} is being assisted by another volunteer. Thank you.`);
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Conversation with ${userFriendlyId} has started`)
        await sendStartChatToUser(userId, volunteer.name);
    } else if (isEndCommand && isAssignedToUser) {
        logInfo(`Volunteer Command: ${name}(${id}): ${command}`);
        const userId = volunteer.asssginedUser
        const userFriendlyId = userDataHandler.getUserFriendlyId(userId)
        await volunteerDataHandler.unassignUserToVolunteer(volunteer.id)
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Conversation with ${userFriendlyId} has ended`)
        await userDataHandler.unassignVolunteerToUser(userId, volunteer.id)
        await sendEndChatToUser(userId, volunteer.name);
    } else if (isGetPendingUsersCommand) {
        const pending = await volunteerDataHandler.getPendingUsers()
        const friendlyPending = pending.map(id => userDataHandler.getUserFriendlyId(id)).join(',')
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Pending users: ${friendlyPending}`)
    } else if (isUnRegisterCommand) {
        await volunteerDataHandler.unRegisterVolunteer(volunteer.id, volunteer.name)
    } else if (isGetRegistered) {
        const names = await volunteerDataHandler.getRegisteredVolunteersByNames()
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Registered: ${names}`)
    } else {
        logError(`Invalid volunteer flow: ${name}(${id}). Command: ${command}. Assinged: ${isAssignedToUser}`);
    }
    return emptySuccessMassage
}

module.exports = {
    newMsg: newMsg,
}