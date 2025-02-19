const moment = require('moment-timezone')
const Reports = require('../models/Reports')
const Payroll = require('../models/Payroll')
const SMSService = require('../services/sms')

module.exports = async function () {
    try {
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

        let contactNumbers = await Promise.all(schedules.map(async data => {

            const result = await Reports.findOne({
                uid: data.uid,
                date: currentDate
            })

            if (result.status !== 'time-out') {
                let contact = data?.user?.[0]?.phone || null
                return { "ContactNumber": contact }
            }
        }))
        let filteredContactNumbers = contactNumbers.filter(({ ContactNumber }) => ContactNumber !== null)
        console.log(filteredContactNumbers)

        //SMSService.send_sms(filteredContactNumbers, "Hey, you are still timed-in. Mind timing out?")

    } catch (error) {
        console.log("SMS NO TIMEOUTS ERR", error)
    }
}