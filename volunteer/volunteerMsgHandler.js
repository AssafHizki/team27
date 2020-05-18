const axios = require('axios');
const log = require('../clients/loggerClient').log;

const BASE_URL = 'http://9deea62c.ngrok.io'
const CHAT_URL = `${BASE_URL}/api/chat`

const sendMsgToUser = async (userId, userName, text) => {
    return await axios.post(CHAT_URL, {
        "userId": userId,
        "userName": userName,
        "text": text
    })
    .then(res => {
        if (res && res.data) {
            log(res.data)
        }
    })
    .catch(error => {
        log(error, level='ERROR');
    })
}

const newMsg = async (id, name, msg) => {
    log(`Volunteer: ${name}(${id}): ${msg}`);
    res = await sendMsgToUser("BPvVJhhlxofoy1TAAAAB", "someuser", msg);
    log(res)
    return {
        body: {status: 'success'},
        status: 200
    }
}

module.exports = {
    newMsg: newMsg,
}