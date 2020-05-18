const env = require('./environment/environment').env();
const bot = require('./clients/telegramClient').getBot();
const volunteerMsgHandler = require('./volunteer/volunteerMsgHandler');
const userMsgHandler = require('./user/userMsgHandler');

console.log(`===> Team27 ${env.ENV_NAME} ${env.VERSION} is running...`)

bot.on('message', async (msg) => {
  const volunteerId = msg.from.id;
  const volunteerName = msg.from.first_name;
  await volunteerMsgHandler.newMsg(volunteerId, volunteerName, msg.text)
});

const express = require('express')
const app = express()
const port = 8088

app.use(express.json());
app.use(express.urlencoded());
app.post('/message', async (req, res) => {
  ret = await userMsgHandler.newMsg(req)
  await res.send(ret.body, ret.status)
})
app.listen(port, () => console.log(`Team27 app listening at http://localhost:${port}`))