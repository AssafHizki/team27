const log = require('../clients/loggerClient').log;
const bot = require('../clients/telegramClient').getBot();

const newMsg = async (id, name, msg) => {
    log(`User: ${name}(${id}): ${msg}`)
    bot.sendMessage('', msg);
}

module.exports = {
    newMsg: newMsg,
}