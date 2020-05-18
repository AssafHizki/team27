const TelegramBot = require('node-telegram-bot-api');
const env = require('../environment/environment').env();
const TOKEN = env.telBotToken;

let bot = false;

const getBot = () => {
    if (!bot) {
        bot = new TelegramBot(TOKEN);
    }
    return bot
}

module.exports = {
    getBot: getBot,
}