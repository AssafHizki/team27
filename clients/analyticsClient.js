
const axios = require('axios');
const env = require('../environment/environment').env();
const logError = require('../clients/loggerClient').logError;

CONV_ENQUEUE = 'conversation_enqueue';
CONV_STARTED = 'conversation_started';
CONV_ENDED_BY_USER = 'conversation_ended_by_user';
CONV_ENDED_BY_VOLUNTEER = 'conversation_ended_by_volunteer';
CONV_TERMINATED = 'conversation_terminated';
USER_MESSAGE = 'user_message';
VOLUNTEER_MESSAGE = 'volunteer_message';


const send = async (id, event_type, event_properties = {}) => {
    try {
        const data = {
            "api_key": env.AMPLITUDE_API_KEY,
            "events": 
            [
                {
                    "user_id": id,
                    "event_type": event_type,
                    "user_properties": {
                        "Environment": env.ENV_NAME,
                        "BackendVersion": env.VERSION
                    },
                    "event_properties": event_properties,
                }
            ]
        }
        await axios.post(env.AMPLITUDE_BASE_URL, data)
    } catch (error) {
        logError(`Failed sending analytics: ${error}`);
    }
}

const conversationEnqueue = async (id) => {
    await send(id, CONV_ENQUEUE)
}

const conversationStarted = async (id, volunteerId) => {
    await send(id, CONV_STARTED, {volunteerId})
}
const conversationEndedByUser = async (id, volunteerId) => {
    await send(id, CONV_ENDED_BY_USER, {volunteerId})
}

const conversationEndedByVolunteer = async (id, volunteerId) => {
    await send(id, CONV_ENDED_BY_VOLUNTEER, {volunteerId})
}

const conversationTerminated = async (id) => {
    await send(id, CONV_TERMINATED)
}

const userMessage = async (id, volunteerId, messageLength) => {
    await send(id, USER_MESSAGE, {volunteerId, messageLength})
}

const volunteerMessage = async (id, volunteerId, messageLength) => {
    await send(id, VOLUNTEER_MESSAGE, {volunteerId, messageLength})
}

module.exports = {
    conversationEnqueue,
    conversationStarted,
    conversationEndedByUser,
    conversationEndedByVolunteer,
    conversationTerminated,
    userMessage,
    volunteerMessage,
}