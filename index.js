'use strict';
const log = require('./clients/loggerClient').log;
const userMsgHandler = require('./user/userMsgHandler');
const volunteerMsgHandler = require('./volunteer/volunteerMsgHandler');
const volunteerDataHandler = require('./volunteer/volunteerDataHandler');
const env = require('./environment/environment').env();

exports.userMessage = async (request, response) => {
  const ret = await userMsgHandler.newMsg(request)
  response.status(ret.status).send(ret.body);
};

const isFromChatManager = (message) => {
  if (message && message.chat && message.chat.id && message.chat.id == env.MANAGER) {
    return true
  }
  return false
}

exports.volunteerMessage = async (request, response) => {
  try {
    log(JSON.stringify(request.body.message), 'DEBUG')
    if (isFromChatManager(request.body.message)) {
      return response.status(200).send({});
    }
    const volunteerId = request.body.message.from.id;
    const volunteerName = request.body.message.from.first_name;
    const ret = await volunteerMsgHandler.newMsg(volunteerId, volunteerName, request.body.message.text)
    response.status(ret.status).send(ret.body);
  } catch (error) {
    log(`Unknown Error from ${volunteerName} (${volunteerName}): ${error.message}`, 'ERROR')
    response.status(200).send({});
  }
};

exports.clearCommand = async (request, response) => {
  log("CLEAR COMMAND!")
  await volunteerDataHandler.clearPendingUsers()
  await volunteerDataHandler.clearVolunteers()
  log("CLEAR DONE!")
  response.status(200).send('OK');
};

