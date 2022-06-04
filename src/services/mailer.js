require('dotenv').config();
const logError = require('./logger');
const sgMail = require('@sendgrid/mail')

const { SG_EMAIL, SG_KEY } = process.env;
sgMail.setApiKey(SG_KEY);

var controller = {
    send_mail: async function (data) {
        let mail = {};

        switch (data.type) {
            case 'send_record':
                mail = {
                    to: "emquintos.sparkles@gmail.com.ph",
                    from: `Sparkle Time In`,
                    subject: `Sparkle Time in Report <${SG_EMAIL}>`,
                    text: 'Some useless text',
                    html: `<p>Here is the report you requested <a href='${data.downloadLink}'>Download </a> \n\n  Have a Sparkling day.\n </p>`
                };
                break;
            default:
                break;
        }


        try {
            sgMail
                .send(mail)
                .then((res) => {
                    return res[0].statusCode;
                })
                .catch(async (error) => {
                    await logError(error, 'MAILER.send_mail.SEND_GRID', data, null, 'POST');
                });
        } catch (err) {
            await logError(error, 'MAILER.send_mail.SEND_GRID', data, null, 'POST');
            return false;
        }


    }
};

module.exports = controller;
