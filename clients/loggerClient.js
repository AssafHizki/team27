const bot = require('../clients/telegramClient').getBot();
const env = require('../environment/environment').env();

const log = (msg, level='INFO') => {
    console.log(`::${level}::${msg}`)
    bot.sendMessage(env.MANAGER, `::${level}::${msg}`);
}

module.exports = {
    log: log,
}