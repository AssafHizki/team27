const env = require('../environment/environment').env();
const axios = require('axios');
const TOKEN = env.TELEGRAM_BOT_TOKEN;


let bot = false;

const getBot = () => {
    if (!bot) {
        bot = {
            sendMessage: async (id, text) => {
                const temp = await axios({
                    method: 'post',
                    url: 'https://slack.com/api/chat.postMessage',
                    headers: {
                        'Content-type': 'application/json',
                        'Authorization': 'Bearer xoxb'
                    },
                    data: {
                        'channel': 'U014SB4EWMS',
                        'text': text,
                        'as_user': true
                }})
                console.log(temp)
            }
        }
    }
    return bot
}

module.exports = {
    getBot: getBot,
}