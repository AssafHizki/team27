const nodemailer = require('nodemailer');
const env = require('../environment/environment').env();

const send = (id, data) => {
    return new Promise((resolve, reject)=>{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
            user: env.GMAIL_USER,
            pass: env.GMAIL_PASS,
            }
        });
        
        const mailOptions = {
            from:  env.GMAIL_USER,
            to: env.EMAIL_RECIPIENTS,
            subject: `[${env.ENV_NAME}] Conversation history for user ${id}`,
            text: data
        };

        return transporter.sendMail(mailOptions, function(error, info ){
            if (error) {
                console.log(error);
                resolve(false);
            } else {
                console.log('Email sent: ' + info.response);
                resolve(true);
            }
        });
    })
}

module.exports = {
    send,
}