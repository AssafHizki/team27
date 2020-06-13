const axios = require('axios');
const log = require('../clients/loggerClient').log;
const volunteerDataHandler = require('./volunteerDataHandler');
const userDataHandler = require('../user/userDataHandler');
const env = require('../environment/environment').env();

const CHAT_URL = `${env.CLIENT_BASE_URL}/api/chat`

const sendMsgToUser = async (userId, userName, text, isFirstMessage) => {
    return await axios.post(CHAT_URL, {
        userId: userId,
        userName: userName,
        text: text,
        isFirstMessage: isFirstMessage
    })
    .then(res => res)
    .catch(error => {
        log(error, 'ERROR');
    })
}

const emptySuccessMassage = {
    body: {status: 'success'},
    status: 200
}

const newMsg = async (id, name, msg) => {
    log(`Volunteer: ${name}(${id}): ${msg}`, level='DEBUG');
    const volunteer = await volunteerDataHandler.getOrCreateVolunteerById(id)
    if (!volunteer) {
        log(`Volunteer not exist: ${name}(${id}): ${msg}`, level='WARNING');
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
        const res = await sendMsgToUser(volunteer.asssginedUser, volunteer.name, msg, false);
        log(`Chat response 1 (${volunteer.asssginedUser}): ${JSON.stringify(res.status)}`, level='DEBUG')
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
        log(`Pending users: ${JSON.stringify(pending)}`)
        if (pending.length == 0) {
            log(`No pending users for volunteer: ${volunteer.name}`)
            return emptySuccessMassage
        }
        const userId = pending[0]
        let user = await userDataHandler.getUserById(userId)
        if (!user) {
            log(`Can not find pending user: ${userId}`, level='ERROR')
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
        const res = await sendMsgToUser(userId, volunteer.name, "", true);
        log(`Chat response 2 (${userId}): ${JSON.stringify(res.status)}`, level='DEBUG')
    } else if (isEndCommand && isAssignedToUser) {
        log(`Volunteer Command: ${name}(${id}): ${command}`);
        const userId = volunteer.asssginedUser
        const userFriendlyId = userDataHandler.getUserFriendlyId(userId)
        await volunteerDataHandler.unassignUserToVolunteer(volunteer.id)
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Conversation with ${userFriendlyId} has ended`)
        await userDataHandler.unassignVolunteerToUser(userId, volunteer.id)
        const res = await sendMsgToUser(userId, volunteer.name, "Conversation ended", true);
        log(`Chat response 3 (${userId}): ${JSON.stringify(res.status)}`, level='DEBUG')
    } else if (isGetPendingUsersCommand) {
        const pending = await volunteerDataHandler.getPendingUsers()
        const friendlyPending = pending.map(id => userDataHandler.getUserFriendlyId(id)).join(',')
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `Pending users: ${friendlyPending}`)
    } else if (isOnShiftCommand) {
        await volunteerDataHandler.goOnShift(volunteer.id)
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `You are now on shift`)
        log(`Volunteer is on shift: ${volunteer.name}(${volunteer.id})`);
    } else if (isOffShiftCommand) {
        await volunteerDataHandler.goOffShift(volunteer.id)
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `You are now off shift`)
        log(`Volunteer is off shift: ${volunteer.name}(${volunteer.id})`);
    } else if (isGetShiftCommand) {
        const onShiftVolunteers = (await volunteerDataHandler.getOnShiftVolunteersByNames()).join(',')
        await volunteerDataHandler.sendMessageToVolunteer(volunteer.id, `On shift: ${onShiftVolunteers}`)
    } else {
        log(`Invalid volunteer flow: ${name}(${id}). Command: ${command}. Assinged: ${isAssignedToUser}`, level='ERROR');
    }
    return emptySuccessMassage
}

module.exports = {
    newMsg: newMsg,
}