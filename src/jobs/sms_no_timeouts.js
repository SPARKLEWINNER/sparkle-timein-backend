const moment = require('moment-timezone')
const Reports = require('../models/Reports')
const Payroll = require('../models/Payroll')
const SMSService = require('../services/sms')

module.exports = async function () {
    try {

        let message  = `⚠️ Uy! Nakalimutan mo mag-Time Out!

Lagpas na ng isang oras sa schedule mo. Importante ’to para tama ang record mo at walang maging aberya sa sahod.

Mag-Time Out na, o sabihan kami kung may kailangan kang tulong!
    `
        const now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
        const currentDate = new Date(now);
        currentDate.setUTCHours(0, 0, 0, 0);


        const currentTime = moment().tz('Asia/Manila').subtract(1, 'hour').format('HH:mm');

        console.log('sms no timeouts', currentDate, currentTime)

        let schedules = await Payroll.aggregate([
            {
                $match: {
                    date: currentDate,
                    to: currentTime.toString()
                }
            },
            {
                $addFields: {
                    convertedUserId: {
                        $toObjectId: "$uid"
                    }
                }
            },
            {
                "$lookup": {
                    from: "users",
                    localField: "convertedUserId",
                    foreignField: "_id",
                    as: "user"
                }
            }
        ])

        console.log('schedules', schedules)

        let contactNumbers = await Promise.all(schedules.map(async data => {
            const result = await Reports.findOne({
                uid: data.uid,
                date: currentDate
            })

            console.log('report for today', result)

            if(!result) return {ContactNumber: null} 

            if (result.status !== 'time-out') {
                let contact = data?.user?.[0]?.phone || null
                return { ContactNumber: contact }
            }

            return {ContactNumber: null}
        }))
        console.log(contactNumbers)
        let filteredContactNumbers = contactNumbers.filter(({ ContactNumber }) => ContactNumber !== null)
        console.log(filteredContactNumbers)
            
        SMSService.send_sms(filteredContactNumbers, message)

    } catch (error) {
        console.log("SMS NO TIMEOUTS ERR", error)
    }
}
