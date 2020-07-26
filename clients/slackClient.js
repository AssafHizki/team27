const env = require('../environment/environment').env();
const axios = require('axios');
const TOKEN = env.telBotToken;


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
                        'Authorization': 'Bearer xoxb-1168818394209-1262759122370-yFraUEo4JdeOy5F67E7JuOSN'
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