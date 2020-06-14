'use strict';
const logInfo = require('./clients/loggerClient').logInfo;
const logError = require('./clients/loggerClient').logError;
const logDebug = require('./clients/loggerClient').logDebug;
const userMsgHandler = require('./user/userMsgHandler');
const volunteerMsgHandler = require('./volunteer/volunteerMsgHandler');
const volunteerDataHandler = require('./volunteer/volunteerDataHandler');
const env = require('./environment/environment').env();

exports.userMessage = async (request, response) => {
  const ret = await userMsgHandler.newMsg(request)
  response.status(ret.status).send(ret.body);
};

const isFromLogDest = (message) => {
  if (message && message.chat && message.chat.id && message.chat.id == env.LOG_DEST) {
    return true
  }
  return false
}

exports.volunteerMessage = async (request, response) => {
  try {
    logDebug(JSON.stringify(request.body.message))
    if (isFromLogDest(request.body.message)) {
      return response.status(200).send({});
    }
    const volunteerId = request.body.message.from.id;
    const volunteerName = request.body.message.from.first_name;
    const ret = await volunteerMsgHandler.newMsg(volunteerId, volunteerName, request.body.message.text)
    response.status(ret.status).send(ret.body);
  } catch (error) {
    logError(`Unknown Error: ${error.message}. Request: ${JSON.stringify(request.body.message)}`)
    response.status(200).send({});
  }
};

exports.clearCommand = async (request, response) => {
  logInfo("CLEAR COMMAND!")
  await volunteerDataHandler.clearPendingUsers()
  await volunteerDataHandler.clearVolunteers()
  logInfo("CLEAR DONE!")
  response.status(200).send('OK');
};

