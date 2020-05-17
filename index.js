'use strict';
const TelegramBot = require('node-telegram-bot-api');
const env = require('./environment/environment').env();
const redis = require('./clients/redisClient')

exports.mainHandler = async (event, _context) => {
  const TOKEN = env.TOKEN;
  const MANAGER = env.MANAGER
  const bot = new TelegramBot(TOKEN);
  await bot.sendMessage(MANAGER, `Server ${env.ENV_NAME} ${env.VERSION} is running`);
  try {

  } catch (error) {
    console.log(error)
    await bot.sendMessage(MANAGER, "Main Handler Error");
    await bot.sendMessage(MANAGER, error.message);
  }
};

