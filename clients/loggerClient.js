const env = require('../environment/environment').env();
const logzioLogger = require('logzio-nodejs').createLogger({
    token: env.LOGZ_IO_TOKEN,
    host: 'listener.logz.io',
    type: 'backend' 
});

const _log = (msg, level) => {
    try {
        // const stringMessage = JSON.stringify(msg)
        var obj = { 
            message: msg, 
            level: level,
            env: env.ENV_NAME,
            version: env.VERSION,
        };
        if (level=='ERROR') {
            console.error(msg)
            logzioLogger.log(obj);
        } else if (level=='WARNING') {
            console.warn(msg)
            logzioLogger.log(obj);
        } else if (level=='INFO') {
            console.log(msg)
            logzioLogger.log(obj);
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
            logzioLogger.log(obj);
        }
    } catch (error) {
        console.log(error)
    }
}

const logDebug = (msg) => {
    _log(msg, 'DEBUG')
}

const logInfo = (msg) => {
    _log(msg, 'INFO')
}

const logWarn = (msg) => {
    _log(msg, 'WARNING')
}

const logError = (msg) => {
    _log(msg, 'ERROR')
}

module.exports = {
    logInfo,
    logError,
    logWarn,
    logDebug,
}