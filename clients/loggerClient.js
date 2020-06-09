const bot = require('../clients/telegramClient').getBot();
const env = require('../environment/environment').env();

const log = (msg, level='INFO') => {
    if (level=='ERROR') {
        console.error(msg)
        bot.sendMessage(env.MANAGER, `${level}\n${msg}`);
    } else if (level=='WARNING') {
        console.warn(msg)
        bot.sendMessage(env.MANAGER, `${level}\n${msg}`);
    } else if (level=='DEBUG') {
        console.log(msg)
    } else {
        bot.sendMessage(env.MANAGER, `${level}\n${msg}`);
        console.log(msg)
    }
}

module.exports = {
    log: log,
}