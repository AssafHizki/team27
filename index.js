'use strict';
const log = require('./clients/loggerClient').log;
const userMsgHandler = require('./user/userMsgHandler');

exports.userHandler = async (request, response) => {
  const ret = await userMsgHandler.newMsg(request)
  response.status(ret.status).send(ret.body);
};

