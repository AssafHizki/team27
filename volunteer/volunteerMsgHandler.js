const axios = require('axios');
const logError = require('../clients/loggerClient').logError;
const logInfo = require('../clients/loggerClient').logInfo;
const logWarn = require('../clients/loggerClient').logWarn;
const logDebug = require('../clients/loggerClient').logDebug;
const volunteerDataHandler = require('./volunteerDataHandler');
const userDataHandler = require('../user/userDataHandler');
const env = require('../environment/environment').env();
const historyHandler = require('../history/historyHandler');
const emailClient = require('../clients/emailClient');
const analyticsClient = require('../clients/analyticsClient');


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
        logDebug(`Sending ${eventType} message to user ${userId}`)
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
    const isVolunteerRegistered = await volunteerDataHandler.isVolunteerRegistered(id)
    if (isRegisterCommand) {
        if (isVolunteerRegistered) {
            await volunteerDataHandler.sendMessageToVolunteer(id, `You are already registered!`)
        } else {
            await volunteerDataHandler.registerVolunteer(id, name, msg)
        }
        return emptySuccessMassage
    }
    if (!isVolunteerRegistered) {
        await volunteerDataHandler.sendMessageToVolunteer(id, `You are not registered`)
        logWarn(`Volunteer not exist: ${name}(${id}): ${msg}`);
        return emptySuccessMassage
    }
    const volunteer = await volunteerDataHandler.getVolunteerById(id)
    const isTakeCommand = volunteerDataHandler.isTakeCommand(command)
    const isEndCommand = volunteerDataHandler.isEndCommand(command)
    const isUnRegisterCommand = volunteerDataHandler.isUnRegisterCommand(command)
    const isGetRegistered = volunteerDataHandler.isGetRegistered(command)
    const isGetPendingUsersCommand = volunteerDataHandler.isGetPendingUsersCommand(command)
    const isAssignedToUser = volunteerDataHandler.isAssignedToUser(volunteer)
    if (!command && isAssignedToUser) {
        await sendMsgToUser(volunteer.assignedUser, volunteer.name, msg);
        await historyHandler.addToVolunteer(volunteer, msg);
        await analyticsClient.volunteerMessage(volunteer.assignedUser, volunteer.id, msg.length);
    } else if (isTakeCommand) {
        logInfo(`Volunteer Command: ${name}(${id}): ${command}`);
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
        await volunteerDataHandler.tryRemoveFromPendingUsers(userId)
        await volunteerDataHandler.sendUserPendingMessagesToVolunteer(volunteer.id, user.pendingMessages, isSystem=false)
        await userDataHandler.clearPendingMessages(userId)
        await volunteerDataHandler.notifyAllUserTaken(userId);
        const userFriendlyId = userDataHandler.getUserFriendlyId(userId)
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Conversation with ${userFriendlyId} has started`)
        await sendStartChatToUser(userId, volunteer.name);
        const updatedVolunteer = await volunteerDataHandler.getVolunteerById(id);
        await historyHandler.setVolunteerStarted(updatedVolunteer);
        await analyticsClient.conversationStarted(userId, volunteer.id);
    } else if (isEndCommand && isAssignedToUser) {
        logInfo(`Volunteer Command: ${name}(${id}): ${command}`);
        const userId = volunteer.assignedUser
        const userFriendlyId = userDataHandler.getUserFriendlyId(userId)
        await volunteerDataHandler.unassignUserToVolunteer(volunteer.id)
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Conversation with ${userFriendlyId} has ended`)
        await userDataHandler.unassignVolunteerToUser(userId, volunteer.id)
        await sendEndChatToUser(userId, volunteer.name);
        await historyHandler.setVolunteerEnded(volunteer)
        const conversationHistory = await historyHandler.getEnhancedConversationHistory(userId);
        await emailClient.send(userId, conversationHistory);
        await analyticsClient.conversationEndedByVolunteer(userId, volunteer.id);
    } else if (isGetPendingUsersCommand) {
        logInfo(`Volunteer Command: ${name}(${id}): ${command}`);
        const pending = await volunteerDataHandler.getPendingUsers()
        const friendlyPending = pending.map(id => userDataHandler.getUserFriendlyId(id)).join(',')
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Pending users: ${friendlyPending}`)
    } else if (isUnRegisterCommand) {
        logInfo(`Volunteer Command: ${name}(${id}): ${command}`);
        await volunteerDataHandler.unRegisterVolunteer(volunteer.id, volunteer.name)
    } else if (isGetRegistered) {
        logInfo(`Volunteer Command: ${name}(${id}): ${command}`);
        const names = await volunteerDataHandler.getRegisteredVolunteersByNames()
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Registered: ${names.join(',')}`)
    } else {
        logError(`Invalid volunteer flow: ${name}(${id}). Command: ${command}. Assinged: ${isAssignedToUser}`);
    }
    return emptySuccessMassage
}

module.exports = {
    newMsg: newMsg,
}