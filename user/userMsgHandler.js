const log = require('../clients/loggerClient').log;
const userDataHandler = require('./userDataHandler');
const volunteerDataHandler = require('../volunteer/volunteerDataHandler');

const getSafeData = (req) => {
    if (!req || !req.body || !req.body.userId) {
        return false
    }

    return {
        id: req.body.userId,
        name: req.body.userName || '',
        text: req.body.text || '',
        type: req.body.eventType || 'text', // [text, start, end]
        timestamp: req.body.timestamp || '',
    }
}

const newMsg = async (req) => {
    try {
        safeData = getSafeData(req)
        if (!safeData.id) {
            return {
                body: {status: 'fail', reason: 'No userId in the request'},
                status: 400
            }
        }
        const existingUser = await userDataHandler.getExistingUser(safeData.id)
        if (safeData.type == 'text') {
            log(`User: ${safeData.name}(${safeData.id}): ${safeData.text}`)
            if (!existingUser) {
                log(`Got message from a non existing user ${safeData.id}`, level='ERROR')
                return {body: {status: `unknown`}, status: 400}
            }
            const assingedVolunteerId = await userDataHandler.findAssingedVolunteerId(safeData.id)
            if (!assingedVolunteerId) {
                if (userDataHandler.isCreated(existingUser.status)) {
                    await userDataHandler.addToPendingMessages(safeData);
                } else {
                    log(`No assinged volunteer to user (text)${safeData.id}`, level='ERROR');
                    return {body: {status: `unknown`}, status: 400}
                }
            } else {
                await volunteerDataHandler.sendMessageToVolunteer(assingedVolunteerId, safeData.text);
            }
        } else if (safeData.type == 'start') {
            if (existingUser) {
                log(`existingUser ${existingUser.id} start conversation`, level='WARNING');
                return {body: {status: `unknown`}, status: 400}
            } else {
                log(`User start: ${safeData.name}(${safeData.id})`);
                await userDataHandler.createUser(safeData);
                await volunteerDataHandler.addToPendingUsers(safeData);
                await volunteerDataHandler.notifyAllNewUser(safeData.id);
            }
        } else if (safeData.type == 'end') {
            if (!existingUser) {
                log(`Non existingUser ${safeData.id} end conversation`, level='WARNING');
                return {body: {status: `unknown`}, status: 400};
            } else {
                log(`User end: ${safeData.name}(${safeData.id})`)
                const assingedVolunteerId = await userDataHandler.findAssingedVolunteerId(safeData.id)
                if (assingedVolunteerId) {
                    await volunteerDataHandler.sendMessageToVolunteer(assingedVolunteerId, 'This person has closed the conversation window. Thank you.');
                    await volunteerDataHandler.unassignVolunteer(assingedVolunteerId)
                    await userDataHandler.setConversationEnded(safeData.id);
                } else {
                    log(`No assinged volunteer to user (end conversation) ${existingUser.id}`, level='ERROR');
                    return {body: {status: `unknown`}, status: 400}
                }
            }
        } else {
            log(`Invalid eventType: ${safeData.name}(${safeData.id})`);
            return {
                body: {status: `Invalid eventType: ${safeData.type}`},
                status: 400
            }
        }
        return {
            body: {status: 'success'},
            status: 200
        }
    } catch (error) {
        log(error, level='ERROR')
        return {
            body: {status: 'fail'},
            status: 500
        }
    }
}

module.exports = {
    newMsg: newMsg,
}