const createError = require('http-errors');
const mongoose = require('mongoose');
const User = require('../models/Users');
const Reports = require('../models/Reports');

const without_time = (dateTime) => {
    var date = new Date(dateTime.getTime());
    date.setHours(0, 0, 0, 0);
    return date;
}

var controllers = {
    report_time: async function (req, res) {
        const { id } = req.params;
        const { status } = req.body;
        const now = new Date();
        let month = now.getUTCMonth() + 1;
        let day = now.getUTCDate();
        let year = now.getUTCFullYear();
        let time = now.getTime();
        let date = without_time(now);

        if (Object.keys(req.body).length === 0) {
            return res.status(400).json(
                {
                    success: false,
                    msg: `Missing fields`
                }
            );
        }
        let user = await User.findOne({ _id: mongoose.Types.ObjectId(id) }).lean().exec();
        if (!user) {
            return res.status(400).json(
                {
                    success: false,
                    msg: 'No such users'
                }
            );
        }


        try {
            let result;
            const isReportsExist = await Reports.find({ "date": new Date(date) }).lean().exec();
            const reports = new Reports({
                uid: id,
                date: date,
                status: status,
                record: {
                    dateTime: now,
                    status: status,
                    month: month,
                    day: day,
                    year: year,
                    time: time,
                    date: date
                }
            });

            if (isReportsExist.length > 0) {
                const isSameStatus = isReportsExist[0].status === status ? true : false;
                if (isSameStatus) return res.status(400).json(
                    {
                        success: false,
                        msg: `Unable to ${status} again`,
                    }
                );

                let newReports = {
                    dateTime: now,
                    status: status,
                    month: month,
                    day: day,
                    year: year,
                    time: time,
                    date: date
                };

                let update = {
                    $set: { status: status },
                    $push: { record: newReports }
                };

                result = await Reports.findOneAndUpdate({ "date": new Date(date) }, update);

            } else {
                result = await Reports.create(reports);
            }

            if (!result) {
                res.status(400).json(
                    {
                        success: false,
                        msg: 'Unable to sign up'
                    }
                );
            };

            res.json(result);
        } catch (err) {
            console.log(err);
            return res.status(400).json(
                {
                    success: false,
                    msg: 'No such users'
                }
            );
        }
    },
    get_status_time: async function (req, res) {
        const { id } = req.params;
        if (!id) res.status(404).json({ success: false, msg: `No such user.` });
        let now = new Date();
        let user = await User.findOne({ _id: mongoose.Types.ObjectId(id) }).lean().exec();
        if (!user) {
            return res.status(400).json(
                {
                    success: false,
                    msg: 'No such users'
                }
            );
        }

        try {
            const result = await Reports.find({ uid: mongoose.Types.ObjectId(id) }).lean().exec();
            if (!result) res.status(400).json(
                {
                    success: false,
                    msg: `Unable to get current user status`
                }
            );
            res.json(result);

        } catch (err) {
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }

    },
}

module.exports = controllers;