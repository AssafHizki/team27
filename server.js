process.env['CLIENT'] = 'staging'

const volunteerMsgHandler = require('./volunteer/volunteerMsgHandler');
const userMsgHandler = require('./user/userMsgHandler');

const express = require('express')
const app = express()
const port = 8088

app.use(express.json());
app.use(express.urlencoded());
app.post('/userMessage', async (req, res) => {
  ret = await userMsgHandler.newMsg(req)
  await res.send(ret.body, ret.status)
})

app.post('/slackVolunteerMessage', async (req, res) => {
  if (req && req.body && req.body.event && !req.body.event.bot_id) {
    const volunteerId = req.body.event.user;
    const volunteerName = req.body.event.user;
    const ret = await volunteerMsgHandler.newMsg(volunteerId, volunteerName, req.body.event.text)
    res.status(ret.status).send(ret.body);
  } else {
    res.status(200).send({status: 'unknown request'});
  }
})

app.post('/telegramVolunteerMessage', async (req, res) => {
  if (req && req.body && req.body.message && req.body.message.from.id) {
    const volunteerId = req.body.message.from.id;
    const volunteerName = req.body.message.from.first_name;
    const ret = await volunteerMsgHandler.newMsg(volunteerId, volunteerName, req.body.message.text)
    res.status(ret.status).send(ret.body);
  } else {
    res.status(400).send({status: 'unknown request'});
  }
})

app.listen(port, () => console.log(`Team27 app listening at http://localhost:${port}`))