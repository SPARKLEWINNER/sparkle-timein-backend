const createError = require("http-errors");
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/Users");
const Reports = require("../models/Reports");
const logError = require("../services/logger");
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = `${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`;
const GOOGLE_API_GEOCODE =
  "https://maps.googleapis.com/maps/api/geocode/json?latlng=";

const without_time = (dateTime) => {
  var date = new Date(dateTime);

  date.setUTCHours(0, 0, 0, 0);

  return date;
};

var controllers = {
  report_time: async function (req, res) {
    const { id } = req.params;
    const { status, location, logdate } = req.body;
    const now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);

    console.log('REPORT_TIME', now);
    let month = now.getUTCMonth() + 1;
    let day = now.getUTCDate();
    let year = now.getUTCFullYear();
    let time = Date.now();

    // convert coordinates to readable address
    let coordinates = `${location.latitude},${location.longitude}`;
    let address = "N/A"
    
    // await axios
    //   .get(
    //     `${GOOGLE_API_GEOCODE}${coordinates}&key=${process.env.GOOGLE_MAP_KEY}`
    //   )
    //   .then((response) => {
    //     if (!response.data) return false;
    //     console.log({response})
    //     return response.data.results[0].formatted_address;
    //   })
    //   .catch((err) => {
    //     console.log({err})
    //     return false;
    //   });

    if (!address || !coordinates)
      return res.status(400).json({
        success: false,
        msg: `Something went wrong in locating user.`,
      });

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }

    // check user if existing
    let user = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
      .lean()
      .exec();

    if (!user) return res.status(400).json({
      success: false,
      msg: "No such users",
    });
    console.log(current_date)

    console.log(without_time(now))

    try {
      let result;
      let date = without_time(now);
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
          location: location,
          address: address,
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
        }

        let last_record =
          record_last.record.length >= 1
            ? record_last.record.slice(-1).pop()
            : record_last.record[0];

        if (last_record.status === status)
          return res.status(400).json({
            success: false,
            msg: `Unable to ${status} again`,
          });

        // check if existing break in / break out
        let tookBreakIn;
        let tookBreakOut;
        Object.values(record_last.record).forEach((v) => {
          if (v.status === "break-in") {
            tookBreakIn = true;
          }

          if (v.status === "break-out") {
            tookBreakOut = true;
          }
        });

        if (tookBreakIn && status === "break-in") {
          return res.status(400).json({
            success: false,
            msg: `Unable to ${status} again`,
          });
        }

        if (tookBreakOut && status === "break-out") {
          return res.status(400).json({
            success: false,
            msg: `Unable to ${status} again`,
          });
        }

        let newReports = {
          dateTime: now,
          status: status,
          month: month,
          day: day,
          year: year,
          time: time,
          date: date,
          location: location,
          address: address,
        };

        let update = {
          $set: { status: status },
          $push: { record: newReports },
        };
        result = await Reports.findOneAndUpdate(
          { date: new Date(date), uid: mongoose.Types.ObjectId(id) },
          update
        );

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
      await logError(err, "Reports", req.body, id, "POST");
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
        return res.status(400).json({
          success: false,
          msg: `Unable to get current user status`,
        });

      if (result.length === 0) return res.status(200).json([{
        date: current_date,
        status: false,
        msg: `No existing Record`,
      }]);
      res.json([result.slice(-1).pop()]);
    } catch (err) {
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_reports: async function (req, res) {
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });

    let user = await User.findOne({
      _id: mongoose.Types.ObjectId(id),
    })
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
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },

  get_reports_range: async function (req, res) {
    const { id, date } = req.params;
    let records = [];
    if (!id || !date )
      res
        .status(404)
        .json({ success: false, msg: `Invalid Request parameters.` });

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
      let employees = await User.find({ company: user.company, role: 0 }, {_id: 1, displayName: 1, company: 1})
        .lean()
        .exec();
      if (!employees) {
        return res.status(200).json({
          success: true,
          msg: "No registered employees",
        });
      }

      employees.map(async (data) => {
        const report = await Reports.find({"$and": [{uid: data._id}, {date: date}]}).sort({ createdAt: -1 })
        .lean()
        .exec();
        records.push({Employee: data, Records: report})
      });

      if (date) {
        let reports = await Reports.find({
            date: date,
          }, {date: 1, status: 1, location: 1, uid: 1}).sort({ createdAt: -1 })
          .lean()
          .exec();
        return res.json(records);  
      }
        
        /*let end_dt = new Date(end_date);
        end_dt = end_dt.setDate(end_dt.getDate() + 1);

        let start_dt = new Date(start_date);
        start_dt = start_dt.setDate(start_dt.getDate());
        await Object.values(reports).forEach((item) => {
        const user = employees.filter(
          (emp) => emp._id.toString() === item.uid.toString()
        );
        if (!user[0]) {
          console.log(employees)
          return
        };
        let _u = {
          _id: user[0]._id,
          displayName:
            user[0].firstName || user[0].lastName
              ? `${user[0].firstName} ${user[0].lastName}`
              : user[0].displayName,
          email: user[0].email,
          phone: user[0].phone,
        };
        reports_with_user.push({
          ..._u,
          date: item.date,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          reports: [item],
        });
      });*/

     /* if (records.length === 0) {
        return res.status(201).json({
          success: true,
          msg: "No Records",
        });
      }*/
/*
      const newArray = reports_with_user
        .sort((a, b) => b.createdAt - a.createdAt)
        .reduce((acc, dt) => {
          const date = new Date(dt.date);
          const y = new Intl.DateTimeFormat("en", { year: "numeric" }).format(
            date
          );
          const m = new Intl.DateTimeFormat("en", { month: "numeric" }).format(
            date
          );
          const d = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(
            date
          );
          const formatedDate = `${m}/${d}/${y}`;
          const dateAcc = acc[formatedDate];
          if (!dateAcc) {
            acc[formatedDate] = {
              date: formatedDate,
              value: [{ ...dt }],
            };
          } else {
            acc[formatedDate].value.push({ ...dt });
          }
          return acc;
        }, {});*/

      
    } catch (err) {
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
};

module.exports = controllers;
