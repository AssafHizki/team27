const volunteerMsgHandler = require('./volunteer/volunteerMsgHandler');
const userMsgHandler = require('./user/userMsgHandler');
const volunteerDataHandler = require('./volunteer/volunteerDataHandler');

const express = require('express')
const app = express()
const port = 8088

app.use(express.json());
app.use(express.urlencoded());
app.post('/userMessage', async (req, res) => {
  ret = await userMsgHandler.newMsg(req)
  await res.send(ret.body, ret.status)
})

app.post('/volunteerMessage', async (req, res) => {
  if (req && req.body && req.body.message && req.body.message.from.id) {
    const volunteerId = req.body.message.from.id;
    const volunteerName = req.body.message.from.first_name;
    const ret = await volunteerMsgHandler.newMsg(volunteerId, volunteerName, req.body.message.text)
    res.status(ret.status).send(ret.body);
  } else {
    res.status(400).send({status: 'unknown request'});
  }
})

app.post('/clearDb', async (req, res) => {
  await volunteerDataHandler.clearPendingUsers()
  await volunteerDataHandler.clearVolunteers()
  res.status(200).send('OK');
})

app.listen(port, () => console.log(`Team27 app listening at http://localhost:${port}`))