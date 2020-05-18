const log = require('../clients/loggerClient').log;

const newMsg = async (id, name, msg) => {
    log(`Volunteer: ${name}(${id}): ${msg}`)
}

module.exports = {
    newMsg: newMsg,
}