require('../testingbase');
const volunteerMsgHandler = require('./volunteerMsgHandler');


describe('Volunteer message handler', () => {
    it('should do something', async (done) => {
        const ret = await volunteerMsgHandler.newMsg(1234, "Somename", "sometext")
        done();
    });
})