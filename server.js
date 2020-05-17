const TelegramBot = require('node-telegram-bot-api');
const env = require('./environment/environment').env();

const TOKEN = env.TOKEN;
const bot = new TelegramBot(TOKEN, {polling: true});
const MANAGER = env.MANAGER

console.log(`===> Team27 ${env.ENV_NAME} ${env.VERSION} is running...`)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function run() {
  await bot.sendMessage(MANAGER, `Server ${env.ENV_NAME} ${env.VERSION} is running`);
  while(true) {
    try {
      await sleep(1000);
    } catch (error) {
      console.error("Got an Error!", error)
      bot.sendMessage(MANAGER, 'Got an Error');
      bot.sendMessage(MANAGER, error.message);
    }
  }
}

run()
