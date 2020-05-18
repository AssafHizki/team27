const log = require('../clients/loggerClient').log;
const bot = require('../clients/telegramClient').getBot();

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
                body: {status: 'fail', reason: 'No userId in request'},
                status: 400
            }
        }
        log(`User: ${safeData.name}(${safeData.id}): ${safeData.text}`)
        bot.sendMessage('', msg);
        return {
            body: {status: 'success'},
            status: 200
        }
    } catch (error) {
        log(e, level='ERROR')
        return {
            body: {status: 'fail'},
            status: 500
        }
    }
}

module.exports = {
    newMsg: newMsg,
}