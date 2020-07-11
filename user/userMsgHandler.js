const logError = require('../clients/loggerClient').logError;
const logInfo = require('../clients/loggerClient').logInfo;
const logWarn = require('../clients/loggerClient').logWarn;
const logDebug = require('../clients/loggerClient').logDebug;const userDataHandler = require('./userDataHandler');
const volunteerDataHandler = require('../volunteer/volunteerDataHandler');
const historyHandler = require('../history/historyHandler');
const emailClient = require('../clients/emailClient');

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
            logDebug(`User: ${safeData.name}(${safeData.id}): ${safeData.text}`)
            if (!existingUser) {
                logError(`Got message from a non existing user ${safeData.id}`)
                return {body: {status: `unknown`}, status: 400}
            }
            const assingedVolunteerId = await userDataHandler.findAssingedVolunteerId(safeData.id)
            if (!assingedVolunteerId) {
                if (userDataHandler.isCreated(existingUser.status)) {
                    await userDataHandler.addToPendingMessages(safeData);
                } else {
                    logError(`No assinged volunteer to user (text)${safeData.id}`);
                    return {body: {status: `unknown`}, status: 400}
                }
            } else {
                await volunteerDataHandler.sendMessageToVolunteer(assingedVolunteerId, safeData.text, isSystem=false);
                await historyHandler.addToUser(safeData.id, safeData.text)
            }
        } else if (safeData.type == 'start') {
            if (existingUser) {
                logWarn(`existingUser ${existingUser.id} start conversation`);
                return {body: {status: `unknown`}, status: 400}
            } else {
                logInfo(`User start: ${safeData.name}(${safeData.id})`);
                await userDataHandler.createUser(safeData);
                await volunteerDataHandler.addToPendingUsers(safeData);
                await volunteerDataHandler.notifyAllNewUser(safeData.id);
                await historyHandler.setUserStarted(safeData.id)
            }
        } else if (safeData.type == 'end') {
            if (!existingUser) {
                logWarn(`Non existingUser ${safeData.id} end conversation`);
                return {body: {status: `unknown`}, status: 400};
            } else {
                logInfo(`User end: ${safeData.name}(${safeData.id})`)
                const assingedVolunteerId = await userDataHandler.findAssingedVolunteerId(safeData.id)
                if (assingedVolunteerId) {
                    await volunteerDataHandler.sendMessageToVolunteer(assingedVolunteerId, 'This person has closed the conversation window. Thank you.');
                    await volunteerDataHandler.unassignVolunteer(assingedVolunteerId)
                    await userDataHandler.setConversationEnded(safeData.id);
                    await historyHandler.setUserEnded(safeData.id)
                    const conversationHistory = await historyHandler.getEnhancedConversationHistory(safeData.id)
                    await emailClient.send(safeData.id, conversationHistory)
                } else {
                    await volunteerDataHandler.removeFromPendingUsers(safeData.id)
                    logInfo(`No assinged volunteer to user (end conversation) ${existingUser.id}`);
                    return {body: {status: `unknown`}, status: 400}
                }
            }
        } else if (safeData.type == 'typing') {
            if (!existingUser) {
                logWarn(`Non existingUser ${safeData.id} sent typing message`);
                return {body: {status: `unknown`}, status: 400}
            }
            const assingedVolunteerId = await userDataHandler.findAssingedVolunteerId(safeData.id)
            if (!assingedVolunteerId) {
                logError(`No assinged volunteer to user (typing)${safeData.id}`);
            }
            await volunteerDataHandler.userIsTyping(assingedVolunteerId)
        } else {
            logInfo(`Invalid eventType: ${safeData.name}(${safeData.id})`);
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
        logError(error)
        return {
            body: {status: 'fail'},
            status: 500
        }
    }
}

module.exports = {
    newMsg: newMsg,
}