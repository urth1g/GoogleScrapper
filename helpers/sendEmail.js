const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
require('dotenv').config({path: __dirname + '../.env'});

const CLIID = "241547988546-2egshkag58cocq3s427iotuifgqe36m9.apps.googleusercontent.com"
const SECRET = "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"

const myOAuth2Client = new OAuth2(
  "241547988546-2egshkag58cocq3s427iotuifgqe36m9.apps.googleusercontent.com",
  "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",
  "https://developers.google.com/oauthplayground"
)

myOAuth2Client.setCredentials({
  refresh_token:"1//04NCPghGREkwQCgYIARAAGAQSNwF-L9Ir6r_z8mbSIU1y813vgMub2FhvoAs4j7G2DFapWnbyUEDyPd6fCE3Za8T6u2P-LNJ7Bdw"
});


const ACCESS_TOKEN = myOAuth2Client.getAccessToken()

async function sendEmail(to, subject, message){
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
         type: "OAuth2",
         user: "amofax.notifications@gmail.com", //your gmail account you used to set the project up in google cloud console"
         clientId: CLIID,
         clientSecret: SECRET,
         refreshToken: "1//04NCPghGREkwQCgYIARAAGAQSNwF-L9Ir6r_z8mbSIU1y813vgMub2FhvoAs4j7G2DFapWnbyUEDyPd6fCE3Za8T6u2P-LNJ7Bdw",
         accessToken: ACCESS_TOKEN //access token variable we defined earlier
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