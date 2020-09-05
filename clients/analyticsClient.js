
const axios = require('axios');
const env = require('../environment/environment').env();
const logError = require('../clients/loggerClient').logError;

const send = (id, event_type) => {
    try {
        const data = {
            "api_key": env.AMPLITUDE_API_KEY,
            "events": 
            [
                {
                    "user_id": id,
                    "event_type": event_type,
                    "user_properties": {
                        "Environment": env.ENV_NAME
                    },
                }
            ]
        }
        await axios.post(env.AMPLITUDE_BASE_URL, data)
    } catch (error) {
        logError(`Failed sending analytics: ${error}`);
    }
}

module.exports = {
    send,
}