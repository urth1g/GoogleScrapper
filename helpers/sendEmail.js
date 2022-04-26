const nodemailer = require('nodemailer');
require('dotenv').config({path: __dirname + '../.env'});

async function sendEmail(to, subject, message){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'amofax.notifications@gmail.com',
          pass: 'ikariam1234'
        }
      });

      var mailOptions = {
        from: "amofax.notifications@gmail.com",
        to: to,
        subject: subject,
        html: message
      };

      let response  = await transporter.sendMail(mailOptions)
      console.log(response)
}

module.exports = { sendEmail };