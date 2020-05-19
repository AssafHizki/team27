'use strict';
const log = require('./clients/loggerClient').log;
const userMsgHandler = require('./user/userMsgHandler');
const volunteerMsgHandler = require('./volunteer/volunteerMsgHandler');
const volunteerDataHandler = require('./volunteer/volunteerDataHandler');

exports.userMessage = async (request, response) => {
  const ret = await userMsgHandler.newMsg(request)
  response.status(ret.status).send(ret.body);
};

exports.volunteerMessage = async (request, response) => {
  const volunteerId = request.body.message.from.id;
  const volunteerName = request.body.message.from.first_name;
  const ret = await volunteerMsgHandler.newMsg(volunteerId, volunteerName, request.body.message.text)
  response.status(ret.status).send(ret.body);
};

exports.clearCommand = async (request, response) => {
  log("CLEAR COMMAND!")
  await volunteerDataHandler.clearPendingUsers()
  await volunteerDataHandler.clearVolunteers()
  log("CLEAR DONE!")
};

