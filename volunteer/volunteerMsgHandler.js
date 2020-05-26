const axios = require('axios');
const log = require('../clients/loggerClient').log;
const volunteerDataHandler = require('./volunteerDataHandler');
const userDataHandler = require('../user/userDataHandler');

const BASE_URL = 'https://discreetly-chat.herokuapp.com'
const CHAT_URL = `${BASE_URL}/api/chat`

const sendMsgToUser = async (userId, userName, text, isFirstMessage) => {
    
    return await axios.post(CHAT_URL, {
        userId: userId,
        userName: userName,
        text: text,
        isFirstMessage: isFirstMessage
    })
    .then(res => res)
    .catch(error => {
        log(error, level='ERROR');
    })
}

const newMsg = async (id, name, msg) => {
    log(`Volunteer: ${name}(${id}): ${msg}`);
    const volunteer = await volunteerDataHandler.getOrCreateVolunteerById(id)
    if (volunteerDataHandler.isAssignedToUser(volunteer)) {
        const res = await sendMsgToUser(volunteer.asssginedUser, volunteer.name, msg, false);
        log(`Chat response1 (${volunteer.asssginedUser}): ${JSON.stringify(res.status)}`, level='DEBUG')
    } else {
        const pending = await volunteerDataHandler.getPendingUsers()
        log(`Pending users: ${JSON.stringify(pending)}`)
        if (pending.length == 0) {
            log(`No pending users for volunteer: ${volunteer.name}`)
            return {body: {status: 'success'}, status: 200}
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
        await volunteerDataHandler.notifyAllAvailable(`Visitor # ${userId.substr(-8,2).toUpperCase()} is being assisted by another volunteer. Thank you.`);
        const res = await sendMsgToUser(userId, volunteer.name, msg, true);
        log(`Chat response2 (${userId}): ${JSON.stringify(res.status)}`, level='DEBUG')
    }
    return {
        body: {status: 'success'},
        status: 200
    }
}

module.exports = {
    newMsg: newMsg,
}