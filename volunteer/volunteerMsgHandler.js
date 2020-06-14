const axios = require('axios');
const logError = require('../clients/loggerClient').logError;
const logInfo = require('../clients/loggerClient').logInfo;
const logWarn = require('../clients/loggerClient').logWarn;
const logDebug = require('../clients/loggerClient').logDebug;
const volunteerDataHandler = require('./volunteerDataHandler');
const userDataHandler = require('../user/userDataHandler');
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
    const volunteer = await volunteerDataHandler.getOrCreateVolunteerById(id)
    if (!volunteer) {
        logWarn(`Volunteer not exist: ${name}(${id}): ${msg}`);
        return emptySuccessMassage
    }
    const command = volunteerDataHandler.getCommandFromMsg(msg)
    const isTakeCommand = volunteerDataHandler.isTakeCommand(command)
    const isEndCommand = volunteerDataHandler.isEndCommand(command)
    const isOnShiftCommand = volunteerDataHandler.isOnShiftCommand(command)
    const isOffShiftCommand = volunteerDataHandler.isOffShiftCommand(command)
    const isGetShiftCommand = volunteerDataHandler.isGetShiftCommand(command)
    const isGetPendingUsersCommand = volunteerDataHandler.isGetPendingUsersCommand(command)
    const isAssignedToUser = volunteerDataHandler.isAssignedToUser(volunteer)
    if (!command && isAssignedToUser) {
        await sendMsgToUser(volunteer.asssginedUser, volunteer.name, msg);
    } else if (isTakeCommand) {
        if (isAssignedToUser) {
            await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `You are already in a conversation`)
            return emptySuccessMassage
        }
        if (!(await volunteerDataHandler.isOnShift(volunteer.id))) {
            await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Can not take conversations off shift`)
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
    } else if (isOnShiftCommand) {
        await volunteerDataHandler.goOnShift(volunteer.id)
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `You are now on shift`)
        logInfo(`Volunteer is on shift: ${volunteer.name}(${volunteer.id})`);
    } else if (isOffShiftCommand) {
        await volunteerDataHandler.goOffShift(volunteer.id)
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `You are now off shift`)
        logInfo(`Volunteer is off shift: ${volunteer.name}(${volunteer.id})`);
    } else if (isGetShiftCommand) {
        const onShiftVolunteers = (await volunteerDataHandler.getOnShiftVolunteersByNames()).join(',')
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `On shift: ${onShiftVolunteers}`)
    } else {
        logError(`Invalid volunteer flow: ${name}(${id}). Command: ${command}. Assinged: ${isAssignedToUser}`);
    }
    return emptySuccessMassage
}

module.exports = {
    newMsg: newMsg,
}