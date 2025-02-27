require('dotenv').config();
const logError = require('./logger');
const sgMail = require('@sendgrid/mail')
const axios = require('axios')

const { SG_EMAIL, SG_KEY } = process.env;
sgMail.setApiKey(SG_KEY);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_EMAIL = process.env.RESEND_EMAIL;

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


    },
    send_mail_resend: async function (email, subject, html) {
        try {
            const response = await axios({
                method: 'post',
                url: 'https://api.resend.com/emails',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    from: RESEND_EMAIL,
                    to: [email],
                    subject: subject,
                    html: html,
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error sending email:', error.response?.data || error.message);
            throw error;
        }
    }
};

module.exports = controller;
