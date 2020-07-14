const env = require('../environment/environment').env();
const logger = require('logzio-nodejs').createLogger({
    token: env.LOGZ_IO_TOKEN,
    host: 'listener.logz.io',
    type: 'backend' 
});

const log = (msg, level) => {
    try {
        // const stringMessage = JSON.stringify(msg)
        var obj = { 
            message: msg, 
            level: level,
            env: env.ENV_NAME,
        };
        if (level=='ERROR') {
            console.error(msg)
            logger.log(obj);
        } else if (level=='WARNING') {
            console.warn(msg)
            logger.log(obj);
        } else if (level=='INFO') {
            console.log(msg)
            logger.log(obj);
        } else if (level=='DEBUG') {
            console.log(msg)
        } else {
            message =  `UNKNOWN LOG LEVEL! level = ${level}. message = ${JSON.stringify(msg)}`
            var obj = { 
                message: message, 
                level: 'ERROR',
                env: env.ENV_NAME,
            };
            console.error(message)
            logger.log(obj);
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