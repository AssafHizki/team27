const bot = require('../clients/telegramClient').getBot();
const env = require('../environment/environment').env();

const log = (msg, level) => {
    try {
        const stringMessage = JSON.stringify(msg)
        if (level=='ERROR') {
            console.error(msg)
            bot.sendMessage(env.LOG_DEST, `${level}\n${stringMessage}`);
        } else if (level=='WARNING') {
            console.warn(msg)
            bot.sendMessage(env.LOG_DEST, `${level}\n${stringMessage}`);
        } else if (level=='DEBUG') {
            console.log(msg)
        } else {
            console.log(msg)
            // bot.sendMessage(env.LOG_DEST, `${level}\n${stringMessage}`);
        }
    } catch (error) {
        console.log(error)
    }
}

const logDebug = (msg) => {
    log(msg, 'DEBUG')
}

const logInfo = (msg) => {
    log(msg, 'INFO')
}

const logWarn = (msg) => {
    log(msg, 'WARNING')
}

const logError = (msg) => {
    log(msg, 'ERROR')
}

module.exports = {
    logInfo,
    logError,
    logWarn,
    logDebug,
}