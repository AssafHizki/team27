const axios = require('axios');
const log = require('../clients/loggerClient').log;
const volunteerDataHandler = require('./volunteerDataHandler');
const userDataHandler = require('../user/userDataHandler');

const BASE_URL = 'http://ed8db2fc.ngrok.io'
const CHAT_URL = `${BASE_URL}/api/chat`

const sendMsgToUser = async (userId, userName, text) => {
    return await axios.post(CHAT_URL, {
        userId: userId,
        userName: userName,
        text: text
    })
    .then(res => res)
    .catch(error => {
        log(error, level='ERROR');
    })
}

const newMsg = async (id, name, msg) => {
    try {
        log(`Volunteer: ${name}(${id}): ${msg}`);
        const volunteer = await volunteerDataHandler.getOrCreateVolunteerById(id)
        if (volunteerDataHandler.isAssignedToUser(volunteer)) {
            const res = await sendMsgToUser(volunteer.asssginedUser, volunteer.name, msg);
            log(`Chat response1 (${volunteer.asssginedUser}): ${JSON.stringify(res.status)}`)
        } else {
            const pending = await volunteerDataHandler.getPendingUsers()
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
            await volunteerDataHandler.sendUserPendingMessagesToVolunteer(volunteer.id, user.pendingMessages)
            await userDataHandler.clearPendingMessages(userId)
            await volunteerDataHandler.notifyAllAvailable('Conversation was acquired by other volunteer, thanks you.');
            const res = await sendMsgToUser(userId, volunteer.name, msg);
            log(`Chat response2 (${userId}): ${JSON.stringify(res.status)}`)
        }
        return {
            body: {status: 'success'},
            status: 200
        }
    } catch (error) {
        log(`Error in volunteer new message: ${JSON.stringify(error)}`, level='ERROR')
        return {body: {status: `unknown`}, status: 400}
    }
}

module.exports = {
    newMsg: newMsg,
}