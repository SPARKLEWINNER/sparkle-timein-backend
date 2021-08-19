const createError = require("http-errors");
const mongoose = require("mongoose");
const User = require("../models/Users");
const Reports = require("../models/Reports");

const without_time = (dateTime) => {
  var date = new Date(dateTime.getTime());
  date.setHours(0, 0, 0, 0);
  return date;
};

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
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    let user = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
      .lean()
      .exec();
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
    try {
      let result;
      const isReportsExist = await Reports.find({
        uid: mongoose.Types.ObjectId(id),
      })
        .lean()
        .exec();
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
          date: date,
        },
      });
      let record_last =
        isReportsExist.length >= 1
          ? isReportsExist.slice(-1).pop()
          : isReportsExist[0];

      if (isReportsExist.length > 0) {
        // if no actual data
        let record_last_date = new Date(record_last.date);

        if (date.toDateString() !== record_last_date.toDateString()) {
          // if with actual data and should have same day of last record
          result = await Reports.create(reports);
          return res.json(result);
        } else {
          let last_record =
            record_last.record.length >= 1
              ? record_last.record.slice(-1).pop()
              : record_last.record[0];
          if (last_record.status === status)
            return res.status(400).json({
              success: false,
              msg: `Unable to ${status} again`,
            });
          console.log(last_record);
          // check if existing break in / break out
          let tookBreak;
          Object.values(record_last.record).forEach((v) => {
            if (v.status === "break-in" || v.status === "break-out")
              tookBreak = true;
          });

          if ((tookBreak && status === "break-in") || status === "break-out")
            return res.status(400).json({
              success: false,
              msg: `Unable to ${status} again`,
            });

          let newReports = {
            dateTime: now,
            status: status,
            month: month,
            day: day,
            year: year,
            time: time,
            date: date,
          };

          let update = {
            $set: { status: status },
            $push: { record: newReports },
          };
          result = await Reports.findOneAndUpdate(
            { date: new Date(date), uid: mongoose.Types.ObjectId(id) },
            update
          );
        }

        // check if existing time in / time out
      } else {
        result = await Reports.create(reports);
      }

      if (!result) {
        return res.status(400).json({
          success: false,
          msg: `Unable to process request ${status}`,
        });
      }

      res.json(result);
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  get_status_time: async function (req, res) {
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });
    let now = new Date();
    let user = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
      .lean()
      .exec();
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }

    try {
      const result = await Reports.find({ uid: mongoose.Types.ObjectId(id) })
        .lean()
        .exec();
      if (!result)
        res.status(400).json({
          success: false,
          msg: `Unable to get current user status`,
        });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_reports: async function (req, res) {
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });
    let user = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
      .lean()
      .exec();
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }

    try {
      let employees = await User.find({ company: user.company, role: 0 })
        .lean()
        .exec();

      if (!employees) {
        return res.status(201).json({
          success: true,
          msg: "No registered employees",
        });
      }
      let details;
      let records = await Promise.all(
        employees.map(async (v, k) => {
          const reports = await Reports.find({
            uid: mongoose.Types.ObjectId(v._id),
          })
            .lean()
            .exec();

          if (!reports) {
            return { ...v, reports: [] };
          }

          return { ...v, reports: [...reports] };
        })
      );
      if (records.length === 0) {
        return res.status(201).json({
          success: true,
          msg: "No Records",
        });
      }

      res.json(records);
    } catch (err) {
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
};

module.exports = controllers;
