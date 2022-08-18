const nodemailer = require('nodemailer');
// const { google } = require("googleapis");
// const OAuth2 = google.auth.OAuth2;
// require('dotenv').config({path: __dirname + '../.env'});

// const CLIID = "241547988546-2egshkag58cocq3s427iotuifgqe36m9.apps.googleusercontent.com"
// const SECRET = "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"

// const myOAuth2Client = new OAuth2(
//   "241547988546-2egshkag58cocq3s427iotuifgqe36m9.apps.googleusercontent.com",
//   "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",
//   "https://developers.google.com/oauthplayground"
// )

// let rt = "1//04rxLJVBpxmRLCgYIARAAGAQSNwF-L9Irpg2EF4bECBRweRNbzghqaeYfnj3BDtcuwsM6aOJIcsEz4lAukhWorCnisq5N6F6bALY"
// myOAuth2Client.setCredentials({
//   refresh_token: rt
// });


// const ACCESS_TOKEN = myOAuth2Client.getAccessToken()

async function sendEmail(to, subject, message){
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
         //type: "OAuth2",
         user: "amofax.notifications@gmail.com", //your gmail account you used to set the project up in google cloud console"
         pass: 'cbdkdnmrvbcybkil'
        //  clientId: CLIID,
        //  clientSecret: SECRET,
        //  refreshToken: rt,
        //  accessToken: ACCESS_TOKEN
    }});

      var mailOptions = {
        from: "amofax.notifications@gmail.com",
        to: to,
        subject: subject,
        html: message
      };

      let response  = await transporter.sendMail(mailOptions)
      console.log(response)
}

//sendEmail("jevremovicdjordje97@gmail.com", "asd", "test")
module.exports = { sendEmail };