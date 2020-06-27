const nodemailer = require('nodemailer');

const send = () => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'DiscreetlyTest@gmail.com',
          pass: 'Meir1234'
        }
    });
      
    const mailOptions = {
        from: 'DiscreetlyTest@gmail.com',
        to: 'meirtz4@gmail.com',
        subject: 'Sending Email using Node.js',
        text: 'That was easy!'
    };

    transporter.sendMail(mailOptions, function(error, info ){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = {
    send,
}