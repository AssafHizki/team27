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

app.post('/volunteerMessage', async (req, res) => {
  if (req && req.body && req.body.message && req.body.message.from.id) {
    const volunteerId = req.body.message.from.id;
    const volunteerName = req.body.message.from.first_name;
    const ret = await volunteerMsgHandler.newMsg(volunteerId, volunteerName, req.body.message.text)
    res.status(ret.status).send(ret.body);
  } else {
    res.status(500).send({status: 'unknown'});
  }
})
app.listen(port, () => console.log(`Team27 app listening at http://localhost:${port}`))