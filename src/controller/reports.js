const fetch = require('node-fetch');
const createError = require("http-errors");
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/Users");
const Group = require("../models/Group");
const Reports = require("../models/Reports");
const Payroll = require("../models/Payroll");
const Checklist = require("../models/Checklist");
const Breaklistinfo = require("../models/Breaklistinfo");
const Breaklist = require("../models/Breaklist");
const Adjustment = require("../models/Adjustmentlogs");
const nodemailer = require("nodemailer");
const {emailAccountVerifiedHTML} = require("../helpers/accountActivate");
const {emailAccountActivationFailHTML} = require("../helpers/accountActivationDecline");
const Coc = require("../models/Coc");
const Tokens = require("../models/Tokens");
const Holidays = require("../models/Holidays");
const logError = require("../services/logger");
const mailer = require("../services/mailer");
const moment = require('moment-timezone');
const uuid = require("uuid").v1;
const Schedule = require("../models/Schedule");
const Announcement = require("../models/announcements");
const crypto = require("crypto");
const jwt = require("jsonwebtoken"); // to generate signed token
const jwt_decode = require('jwt-decode')

const maxAge = 3 * 24 * 60 * 60;
const create_token = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: maxAge });
};
moment().tz('Asia/Manila').format();
const current_date = `${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`;
const { generateExcelFile } = require('../helpers/rangedData')
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
    const { status, location, logdate, previous, ip } = req.body;
    const now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
    const emp_name = await User.findOne({_id: mongoose.Types.ObjectId(id)}, { _id: 0, firstName: 1, lastName: 1, displayName: 1, company: 1 }).lean().exec()
    let month = now.getUTCMonth() + 1;
    let day = now.getUTCDate();
    let year = now.getUTCFullYear();
    let time = Date.now();

    // convert coordinates to readable address
    let coordinates = `${location.latitude},${location.longitude}`;
    let address = "N/A"
    let formattedTime = moment().format('LT')
    let formattedDate = moment().format('L')
    let formattedNow = moment().format('MMMM Do YYYY, h:mm:ss a');
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

    await User.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(id) },
      { $set: { updatedAt: now } }
    );

    if (!user) return res.status(400).json({
      success: false,
      msg: "No such users",
    });

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
        createdAt: now,
        updatedAt: now,
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
          ip: "Test"
        },
      });

      let record_last =
        isReportsExist.length >= 1
          ? isReportsExist.slice(-1).pop()
          : isReportsExist[0];
      let record_last_date = new Date();

      if (record_last !== undefined) {
        // if no actual data
        record_last_date = new Date(record_last.date);
        const body = {
          "emp_id": id,
          "emp_name": emp_name.lastName + " " + emp_name.firstName,
          "status": status,
          "time": formattedTime,
          "store": emp_name.company,
          "date": formattedDate,
        }
        if (status === 'time-in') {
          // if time in and should create another session
          result = await Reports.create(reports);
          const response = await fetch('https://payroll-live.sevenstarjasem.com/payroll/public/api/attendance', {
            method: 'post',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json'}
          });
          if (response.status !== 200) {
            await logError(err, "Reports", req.body, id, "POST");
            return res.status(400).json({
              success: false,
              msg: "Connection to payroll error",
            });  
          }
          else {
            return res.json(result);  
          }
          return res.json(result);
        }
        else {
          let last_record =
            record_last.record.length >= 1
              ? record_last.record.slice(-1).pop()
              : record_last.record[0];

          if (last_record.status === status)
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
            location: location,
            address: address,
            ip: "Test"
          };

          let update = {
            $set: { status: status, updatedAt: now },
            $push: { record: newReports },
          };
          result = 
          await Reports.findOneAndUpdate(
            { _id: mongoose.Types.ObjectId(previous) },
             update
          );  
        }
        
        // await Reports.findOneAndUpdate(
        //   { date: new Date(previous), uid: mongoose.Types.ObjectId(id) },
        //   update,
        //   { sort: { 'updatedAt': -1 } }
        // );

        // check if existing time in / time out
      } else {
        const body = {
          "emp_id": id,
          "emp_name": emp_name.lastName + " " + emp_name.firstName,
          "status": status,
          "time": formattedTime,
          "store": emp_name.company,
          "date": formattedDate,
        }
        result = await Reports.create(reports);
        const response = await fetch('https://payroll-live.sevenstarjasem.com/payroll/public/api/attendance', {
          method: 'post',
          body: JSON.stringify(body),
          headers: {'Content-Type': 'application/json'}
        });
        if (response.status !== 200) {
          await logError(err, "Reports", req.body, id, "POST");
          return res.status(400).json({
            success: false,
            msg: "Connection to payroll error",
          });  
        }
      }

      if (!result) {
        return res.status(400).json({
          success: false,
          msg: `Unable to process request ${status}`,
        });
      }
      const body = {
        "emp_id": id,
        "emp_name": emp_name.lastName + " " + emp_name.firstName,
        "status": status,
        "time": formattedTime,
        "store": emp_name.company,
        "date": record_last_date,
      }
      const response = await fetch('https://payroll-live.sevenstarjasem.com/payroll/public/api/attendance', {
        method: 'post',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'}
      });
      if (response.status !== 200) {
        return res.status(400).json({
          success: false,
          msg: "Connection to payroll error",
        });  
      }
      else {
        res.json(result);  
      } 
      /*res.json(result);*/
    } catch (err) {
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
    let now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
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
      let records = await User.aggregate([
        {
          $lookup: {
            from: "reports",
            localField: "_id",
            foreignField: "uid",
            as: "reports",
          }
        }
      ]).match({
        "company": user.company,
        "role": 0
      }).exec();

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
    if (!id || !date)
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
      let employees = await User.find({ company: user.company, role: 0 }, { _id: 1, displayName: 1, company: 1 })
        .lean()
        .exec();
      if (!employees) {
        return res.status(200).json({
          success: true,
          msg: "No registered employees",
        });
      }

      employees.map(async (data) => {
        const report = await Reports.find({ "$and": [{ uid: data._id }, { date: date }] }).sort({ createdAt: -1 })
          .lean()
          .exec();
        records.push({ Employee: data, Records: report })
      });

      if (date) {
        let reports = await Reports.find({
          date: date,
        }, { date: 1, status: 1, location: 1, uid: 1 }).sort({ createdAt: -1 })
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
        }, {});


    } catch (err) {
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_reports_rangev2: async function (req, res) {

    const { id, startDate, endDate } = req.params;
    var dates = []
    for (var d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
      dates.push(moment(d).format('YYYY-MM-DD'))
    }
    if (!id || !startDate || !endDate )
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
      let employees = await User.find({$and: [{company: user.company, role: 0, isArchived: false}]}, { displayName: 1, lastName: 1, firstName: 1})
        .lean()
        .exec();
      let count = employees.length 
      if (!employees) {
        return res.status(200).json({
          success: true,
          msg: "No registered employees",
        });
      }
      let records = []
      let d = []
      let finalReports = []
      let reports = []
/*      employees.map(async data => {
        console.log(data)
        let result = await Reports.find({uid: data._id}).lean().exec()
        records.push({Employee: data, reports: result, count: count })
      })*/

      employees.map(data => {
       dates.map(date => {
          const result = Reports.find({$and: [{uid: data._id}, {date: date}]}).lean().exec()
          d.push({date: date})  
        })
      })

      employees.map(async data => {
       dates.map(async date => {
          const result = await Reports.find({$and: [{uid: data._id}, {date: date}]}).lean().exec()
          records.push({Employee: data, date: date, reports:result, count: count})  
        })
      })


      let reportsv2 = await Reports.findOne({}).lean().exec()
/*      dates.map(date => {
        console.log(date)
        const filterResult = records.filter((data, key) => {
          console.log(data.reports[0])
          if (data.reports !== null) {
            if (moment(data.reports.date).format('YYYY-MM-DD') === moment(date).format('YYYY-MM-DD')) {
              finalReports.push(filterResult)   
            }  
          }
        })
      })*/

/*      records.sort(function(a,b){
        return new Date(a.date) - new Date(b.date);
      });  */


      records.sort(function(a, b){
          if(a.Employee.lastName < b.Employee.lastName) { return -1; }
          if(a.Employee.lastName > b.Employee.lastName) { return 1; }
          return 0;
      })
      return res.json({data: records, l: d.length}); 
    } catch (err) {
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_reports_range_migs: async function (req, res) {

    const { id, startDate, endDate } = req.params;
    if (!id || !startDate || !endDate)
      res
        .status(404)
        .json({ success: false, msg: `Invalid Request parameters.` });

    try {
      fetch(`${process.env.REPORT_MS}/${id}/${startDate}/${endDate}`).then(res => res.json()).then(async data => {
        if (data.status == "success") {
          const email = await User.findOne({ _id: id }, { _id: 0, email: 1 })
            .lean()
            .exec();
          const path = data.path
          const monthNo = startDate.slice(5,7)
          function monthName(mon) {
             return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][mon - 1];
          }
          const month = monthName(monthNo);
          let items = {
            "mail": "edrugonzales@gmail.com", //email.email for production. personal email for testing
            "path": path,
            "month": month
          }
          let options = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(items)
          }
          fetch(`${process.env.MAILER_MS}`, options).then(res => res.json()).then(async mailResponse => {
            if (mailResponse.success == true) {
              console.log("email sent success")
            }
            console.log(mailResponse)
          })
          return res.json({ success: true, msg: 'We will be sending a notification for the complete download link.' });
        }  
      })
      .catch(err => {
        console.error(err)
        return false;
      });
    } catch (err) {
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  report_workmate_time: async function (req, res) {
    const { id } = req.params;
    const { status, location, logdate, previous, workmate, ip } = req.body;
    const now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
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
          workmate: workmate,
          ip: ip
        },
      });
      let record_last =
        isReportsExist.length >= 1
          ? isReportsExist.slice(-1).pop()
          : isReportsExist[0];

      if (isReportsExist.length > 0) {
        // if no actual data
        let record_last_date = new Date(record_last.date);

        if (status === 'time-in') {
          // if time in and should create another session
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
        // let tookBreakIn;
        // let tookBreakOut;
        // Object.values(record_last.record).forEach((v) => {
        //   if (v.status === "break-in") {
        //     tookBreakIn = true;
        //   }

        //   if (v.status === "break-out") {
        //     tookBreakOut = true;
        //   }
        // });

        // if (tookBreakIn && status === "break-in") {
        //   return res.status(400).json({
        //     success: false,
        //     msg: `Unable to ${status} again`,
        //   });
        // }

        // if (tookBreakOut && status === "break-out") {
        //   return res.status(400).json({
        //     success: false,
        //     msg: `Unable to ${status} again`,
        //   });
        // }

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
          workmate: workmate,
          ip: ip
        };

        let update = {
          $set: { status: status },
          $push: { record: newReports },
        };
        result = 
        await Reports.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(previous) },
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
      await logError(err, "Reports", req.body, id, "POST");
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  get_limited_reports: async function (req, res) {
    const { id } = req.params;
    if (!id || id === undefined || id === "") {
      res.status(404).json({ success: false, msg: `Something went wrong please try again.` });
    }
    else {
      try {
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
          let records = await Reports.find({uid: mongoose.Types.ObjectId(id)})
          .sort([['date', -1]])
          .limit(10)
          .exec();

          if (records.length === 0) {
            return res.status(201).json({
              success: true,
              msg: "No Records",
            });
          }
          res.json(records);
        } catch (err) {
          await logError(err, "get_limited_reports", null, id, "POST");
          res.status(400).json({ success: false, msg: err });
          throw new createError.InternalServerError(err);
        }
      } catch (err) {
          await logError(err, "get_limited_reports", null, id, "POST");
          res.status(400).json({ success: false, msg: err });
          throw new createError.InternalServerError(err);
      }
      
    }
  },
  get_reports_bydate: async function (req, res) {
    let { id, date } = req.params
    if (date === "Invalid date") {
      date = moment(new Date).format('YYYY-MM-DD')
    }
    const myDate = new Date(date)
    if (!id) res.status(404).json({ success: false, msg: `No such user.` })

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
      let records = await Reports.find({uid: mongoose.Types.ObjectId(id), date: myDate})
      .sort([['date', -1]])
      .limit(1)
      .exec();

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

  update_user_record: async function (req, res) {
    const { timein, timeout, breakin, breakout, uid } =
      req.body;
    const { id } = req.params;
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    try {
      await Reports.updateOne(
        { _id: id, "record.status": "time-in" },
        { $set: { "record.$.time" : timein } },
      )
      await Reports.updateOne(
        { _id: id, "record.status": "break-in" },
        { $set: { "record.$.time" : breakin } },
      )
      await Reports.updateOne(
        { _id: id, "record.status": "break-out" },
        { $set: { "record.$.time" : breakout } },
      )
      await Reports.updateOne(
        { _id: id, "record.status": "time-out" },
        { $set: { "record.$.time" : timeout } },
      )
      const now = new Date();
      const formattedDateTime = now.toLocaleString();
      let user = await User.findOne({ _id: mongoose.Types.ObjectId(uid), isArchived: false })
        .lean()
        .exec();
      data = {
        uid: uid,
        email: user.email,
        name: user.displayName,
        processid: id,
        description: `${user.displayName} with uid ${uid} updated record with process id ${id} dated ${formattedDateTime}.`
      }
      await Adjustment.create(data);
      return res.status(200).json({
        success: true,
        msg: "Record updated",
      });
    } catch (err) {
      await logError(err, "Reports", req.body, id, "PATCH");
      console.log(err)
      return res.status(400).json({
        success: false,
        msg: "No records found",
      });
    }
  },

  get_reports_by_id: async function (req, res) {
    
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });

    let report = await Reports.findOne({
      _id: mongoose.Types.ObjectId(id),
    })
      .lean()
      .exec();
    if (!report) {
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
    if (report.length === 0) {
      return res.status(201).json({
        success: true,
        msg: "No Records",
      });
    }
    else {
      res.json([report]);
    }

    
  },
  remove_record: async function (req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        msg: `Record not found ${id}`,
      });
    }

    try {
      await Reports.deleteOne({ _id: mongoose.Types.ObjectId(id) }).then((record) => {
        if (!record)
          return res
            .status(400)
            .json({ success: false, msg: `Unable to remove record ${id}` });
        if (record.deletedCount === 0) {
          return res.status(400).json({
            success: true,
            msg: "No record found",
          }); 
        }
        else {
          return res.status(200).json({
            success: true,
            msg: "Record updated",
          });  
        }
        
      });
    } catch (err) {
      console.log(err);
      await logError(err, "Reports.remove_record", req.body, id, "DELETE");
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  remove_last_record: async function (req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        msg: `Record not found ${id}`,
      });
    }

    try {
      const reportStatus = await Reports.findOne({_id: mongoose.Types.ObjectId(id)})
      const newStatus = reportStatus.record[reportStatus.record.length - 2].status

      const record = await Reports.updateOne({ _id: mongoose.Types.ObjectId(id) }, { $pop: { record: 1 } }).then(async (record) => {
        if (!record) {
          return res
              .status(400)
              .json({ success: false, msg: `Unable to remove record ${id}` });
        }
        else {
          const updateStatus = await Reports.updateOne({ _id: mongoose.Types.ObjectId(id) }, {"status": newStatus}) 
          .then((status) => {
            if (!status)
              return res
                .status(400)
                .json({ success: false, msg: `Unable to remove record ${id}` });
            return res.status(200).json({
              success: true,
              msg: "Success",
            });
          })
        }
      })

    } catch (err) {
      console.log(err);
      await logError(err, "Reports.remove_record", req.body, id, "DELETE");
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }


  },
  generate_password: async function (req, res) {
    const password = Math.floor(100000 + Math.random() * 900000)
    try {
      const result = await Tokens.replaceOne(
        {},
        { token: password }
      )
      return res.status(200).json({
        success: true,
        msg: "Record created",
        password: password
      });
    } catch (err) {
      console.log(err);
      await logError(err, "Reports.generate_password", req.body, id, "GET");
      return res.status(400).json({
        success: false,
        msg: "Something went wrong",
      });
    }
  },
  validate_password: async function (req, res) {
    const { token } = req.params;
    try {
      const result = await Tokens.find({token: token})
      .lean()
      .exec();
      if (result.length > 0) {
        return res.status(200).json({
          success: true,
          msg: "Password validated",
        });  
      }
      else {
        return res.status(400).json({
          success: false,
          msg: "Invalid password",
        }); 
      }
      
    } catch (err) {
      console.log(err);
      await logError(err, "Reports.generate_password", req.body, id, "GET");
      return res.status(400).json({
        success: false,
        msg: "Something went wrong",
      });
    }
  },
  get_limited_reportsV2: async function (req, res) {
    try {
      let records = await Reports.find({})
      .sort([['date', -1]])
      .limit(10)
      .exec();

      if (records.length === 0) {
        return res.status(201).json({
          success: true,
          msg: "No Records",
        });
      }

      res.json(records);
    } catch (err) {
      await logError(err, "Reports.get_limited_reportsV2", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_company: async function (req, res) {
    try {
      let records = await User.find({role: 1, isArchived: false}, {company: 1})
      .distinct("company")
      .exec();
      if (records.length === 0) {
        return res.status(201).json({
          success: true,
          msg: "No Records",
        });
      }

      res.json(records);
    } catch (err) {
      await logError(err, "Reports.get_company", null, "", "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_reports_store: async function (req, res) {
    const { store } = req.body;
    const { date } = req.params;

    if (!store || !date) {
        return res.status(404).json({ success: false, msg: `Invalid Request parameters.` });
    }

    try {
        // Find employees that match the criteria
        let employees = await User.find({ company: store, role: 0, isArchived: false }, { _id: 1, displayName: 1, firstName: 1, lastName: 1 }).lean().exec();

        if (!employees || employees.length === 0) {
            return res.status(200).json({
                success: true,
                msg: "No registered employees",
            });
        }

        // Initialize a counter for employees with reports
        let employeesWithReportsCount = 0;

        // Fetch reports for all employees in parallel using Promise.all
        let records = await Promise.all(employees.map(async (data) => {
            const report = await Reports.find({ uid: data._id, date }).sort({ date: -1 }).lean().exec();

            // If the employee has at least one report, increment the counter
            if (report.length > 0) {
                employeesWithReportsCount++;
            }

            return { Employee: data, Records: report, hasReports: report.length > 0 };
        }));

        // Add the count of employees with reports to the final response
        return res.json({
            success: true,
            count: employeesWithReportsCount,
            records: records
        });
    } catch (err) {
        await logError(err, "Reports.get_reports_store", null, store, "GET");
        return res.status(400).json({ success: false, msg: err.message });
    }
  },
  get_store_personnel: async function (req, res) {
    const { store } = req.body;
    let records = [];
    if (!store)
      res
        .status(404)
        .json({ success: false, msg: `Invalid Request parameters.` });
    try {
      let stores = await User.find({ company: store, role: 0, isArchived: false}, { displayName: 1, _id: 1 })
        .lean()
        .exec();
      if (!stores) {
        return res.status(200).json({
          success: true,
          msg: "No registered employees",
        });
      }  
      let reportsv2 = await Reports.findOne({}).lean().exec()
      return res.json(stores);
    } catch (err) {
      await logError(err, "Reports.get_reports_store", null, store, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_reports_store_distance: async function (req, res) {
    const { lat, long } = req.body;
    if (!lat || !long)
      res
        .status(404)
        .json({ success: false, msg: `Invalid Request parameters.` });
    try {
      let store = await User.find({ location: { $geoWithin: { $center: [ [long, lat], .0003 ] } } })
        .lean()
        .exec();
      if (!store) {
        return res.status(200).json({
          success: true,
          msg: "No store in the area found",
        });
      }
      return res.json(store);
    } catch (err) {
      await logError(err, "Reports.get_reports_store_distance", null, "", "POST");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_active_users: async function (req, res) {
    const { company, month } = req.body;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
      /*let records = await User.find({"createdAt": {$gte: new Date('2022-10-17'), $lte: new Date('2022-10-24')}, 
  "company": new RegExp("syzygy", 'i')})*/
    let records = await Reports.aggregate([
      {
        $lookup: {
            from: 'users',
            localField: 'uid',
            foreignField: '_id',
            as: 'user'
        }
      }
    ]).match({
      "user.company": new RegExp(`${company}`, 'i'),
      "createdAt": {
          $gte: new Date(`${currentYear}-${month}-01`),
          $lte: new Date(`${currentYear}-${month}-31`)
      }
    }).project({
      "user.company": 1,
      "_id": 0,
      "user.displayName": 1,
    }).sort({
      "user.company": 1
    })

    if (records.length === 0) {
      return res.status(201).json({
        success: true,
        msg: "No Records",
      });
    }
    let finalRec = []
    records.map(data => {
      finalRec.push({store: data.user[0].company, name: data.user[0].displayName})
    })
/*    let finalRec = []
    records.map(data => {
      finalRec.push({name: data.displayName})
    })*/
    res.json(finalRec);
  },

  set_company_coc: async function(req, res) {
    const { company, link } = req.body;
    if (!company || !link) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    const coc = new Coc({
      company: company,
      link: link
    }); 
    result = await Coc.updateOne({company: company}, {link: link}, {upsert: true}, function(err, doc) {
      if (err) return res.send(400, {error: err})
      return res.send({success: true, msg: 'Succesfully updated'})
    })
  },

  get_company_coc: async function(req, res) {
    const { company } = req.body;
    if (!company) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    const record = await Coc.findOne({company: company})
      .lean()
      .exec();
    res.json(record)
  },

  post_payroll_record: async function(req, res) {
    const { uid, record, month } = req.body; 
    const payroll = new Payroll({
      uid: uid,
      record: record,
      month: month
    }); 
    let update = {
      $set: { month: month, record: record },
    };
    result = await Payroll.updateOne( { uid: uid }, update, {upsert: true} ).lean().exec()
    if (result) {
      return res.status(200).json({
        success: true,
        msg: `Record save`,
      });  
    }
    else {
      return res.status(400).json({
        success: false,
        msg: `Something went wrong contact admin`,
      });
    }
    res.json(result)
  },

  get_payroll_records: async function(req, res) {
    const record = await Payroll.findOne({})
      .lean()
      .exec();
    res.json(record)
  },

  get_payroll_record: async function(req, res) {
    const { uid, month } = req.body;
    if (!uid || !month) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    const record = await Payroll.findOne({uid: uid, month: month})
      .lean()
      .exec();
    res.json(record)
  },
  post_schedule: async function(req, res) {
    const { uid, from, to, date, name, company, totalHours, breakMin, position, ot, nightdiff, rd } = req.body;
    if (!uid || !from || !to || !date || !name || !company || !totalHours || !position) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    const [month, day, year] = date.split('/');
    const formattedDate = new Date(Date.UTC(year, month - 1, day));
    let update = {
      $set: { from: from, to: to, name: name, company: company, totalHours: totalHours, breakMin: breakMin, position: position, otHours: ot, nightdiff: nightdiff, restday: rd},
    };
    result = await Payroll.updateOne( { uid: uid, date: formattedDate }, update, {upsert: true} ).lean().exec()
    const body = {
        "emp_id": uid,
        "time_in": from,
        "total_hours" : totalHours,
        "time_out": to,
        "date": date
    }
    const response = await fetch('https://payroll-live.sevenstarjasem.com/payroll/public/api/schedule', {
      method: 'post',
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'}
    });
    if(response.status === 200) {
      res.json(result)  
    }
    else {
      return res.status(400).json({
        success: false,
        msg: `Something went wrong please contact your IT administrator`,
      });
    }
    
  },
  get_schedule: async function(req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    const record = await Payroll.find({uid: mongoose.Types.ObjectId(id)}).sort({date: -1})
      .lean()
      .exec();
    res.json(record)
  },
  get_schedule_range: async function(req, res) {
    const { id, from, to } = req.body;
    let records = []
    let personnelName
    let legalHoliday = 0
    let specialHoliday = 0
    if (!id) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    else {
      let personnels = await User.findOne({_id: mongoose.Types.ObjectId(id), isArchived: false})
      .lean()
      .exec();
      personnelName = personnels.displayName
    }
    let formattedDate = new Date(to);
    formattedDate.setDate(formattedDate.getDate() + 0);
    const record = await Payroll.find({uid: mongoose.Types.ObjectId(id), date: {$gte: new Date(from), $lte: new Date(formattedDate) }}).sort({date: 1})
      .lean()
      .exec();
    await Promise.all(record.map(async data => {
      let date = moment(data.date).utc().format('YYYY-MM-DD')
      let reportsArray = await Reports.find({uid: mongoose.Types.ObjectId(id), date: date})
      .limit(1)
      .lean()
      .exec();
      
      if (reportsArray.length > 0) {
        let timeInStamp
        let timeOutStamp
        const hasTimeIn = reportsArray[0].record.some(entry => entry.status === 'time-in');
        const hasTimeOut = reportsArray[0].record.some(entry => entry.status === 'time-out');
        let reportsLength = reportsArray[0].record.length
        if (hasTimeIn && hasTimeOut) {
          if(typeof reportsArray[0].record[0].time != "number") {
            let [hours, minutes] = reportsArray[0].record[0].time.split(':').map(part => parseInt(part, 10));
            let date = new Date();
            date.setHours(hours);
            date.setMinutes(minutes);
            date.setSeconds(0);
            date.setMilliseconds(0);
            let timestamp = date.getTime();
            timeInStamp = `${moment(timestamp).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`
          }
          else {
            timeInStamp = `${moment(reportsArray[0].record[0].time).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z` 
          }
          if(typeof reportsArray[0].record[reportsLength - 1].time != "number") {
            let [hours, minutes] = reportsArray[0].record[reportsLength - 1].time.split(':').map(part => parseInt(part, 10));
            let date = new Date();
            date.setHours(hours);
            date.setMinutes(minutes);
            date.setSeconds(0);
            date.setMilliseconds(0);
            let timestamp2 = date.getTime();
            timeOutStamp = `${moment(timestamp2).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`
          }
          else {
            timeOutStamp = `${moment(reportsArray[0].record[reportsLength - 1].time).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`   
          }
/*          var dateStr = data.date;
          var timeStr = data.to.toString();

          // Parse the date string using Moment.js
          var dateTest = moment(dateStr);

          // Parse the time string and set the hours and minutes to the date
          var timeParts = timeStr.split(':');
          var hoursTest = parseInt(timeParts[0], 10);
          var minutesTest = parseInt(timeParts[1], 10);

          dateTest.set({
              hour: hoursTest,
              minute: minutesTest,
          });

          // Output the combined date and time
          console.log("Combined Date and Time: " + moment(dateTest).format());*/
   /*       console.log(reportsArray[0].record[reportsArray.length].dateTime)*/
          const parsedDate = new Date(timeInStamp);
          const [year, month, day] = [
            parsedDate.getUTCFullYear(),
            parsedDate.getUTCMonth(),
            parsedDate.getUTCDate()
          ];
          const parsedDateTimeOut = new Date(data.date);
          const [timeOutYear, timeOutMonth, timeOutDay] = [
            parsedDateTimeOut.getUTCFullYear(),
            parsedDateTimeOut.getUTCMonth(),
            parsedDateTimeOut.getUTCDate()
          ];
          const [hours, minutes] = data.from.split(':').map(Number);
          const [hoursTimeOut, minutesTimeOut] = data.to.split(':').map(Number);
          const combinedDate = new Date(Date.UTC(year, month, day, hours, minutes));
          const combinedDate2 = new Date(Date.UTC(timeOutYear, timeOutMonth, timeOutDay, hoursTimeOut, minutesTimeOut));
          const timeIn = moment(timeInStamp).utc().format('HH:mm');
          const timeOut = moment(timeOutStamp).utc().format('HH:mm');
          const parsedDate1 = new Date(timeInStamp);
          const parsedDate2 = new Date(combinedDate);
          const parsedDateTimeOut1 = new Date(timeOutStamp);
          const parsedDateTimeOut2 = new Date(combinedDate2);
          const timeOnly1 = `${parsedDate1.getUTCHours().toString().padStart(2, '0')}:${parsedDate1.getUTCMinutes().toString().padStart(2, '0')}:${parsedDate1.getUTCSeconds().toString().padStart(2, '0')}`;
          const timeOnly2 = `${parsedDate2.getUTCHours().toString().padStart(2, '0')}:${parsedDate2.getUTCMinutes().toString().padStart(2, '0')}:${parsedDate2.getUTCSeconds().toString().padStart(2, '0')}`;
          const timeOutTimeOnly1 = `${parsedDateTimeOut1.getUTCHours().toString().padStart(2, '0')}:${parsedDateTimeOut1.getUTCMinutes().toString().padStart(2, '0')}:${parsedDateTimeOut1.getUTCSeconds().toString().padStart(2, '0')}`;
          const timeOutTimeOnly2 = `${parsedDateTimeOut2.getUTCHours().toString().padStart(2, '0')}:${parsedDateTimeOut2.getUTCMinutes().toString().padStart(2, '0')}:${parsedDateTimeOut2.getUTCSeconds().toString().padStart(2, '0')}`;
          const referenceDate = '1970-01-01T';
          const dateTime1 = new Date(referenceDate + timeOnly1 + 'Z');
          const dateTime2 = new Date(referenceDate + timeOnly2 + 'Z');
          let dateTimeOut1 = new Date(parsedDateTimeOut1);
          let dateTimeOut2 = new Date(parsedDateTimeOut2);
          if (data.from < data.to) {
            dateTimeOut1 = new Date(referenceDate + timeOutTimeOnly1 + 'Z');
            dateTimeOut2 = new Date(referenceDate + timeOutTimeOnly2 + 'Z');
          }
          else {
            dateTimeOut1 = new Date(reportsArray[0].record[0]);
            dateTimeOut2 = new Date(dateTimeOut2.getTime() + 24 * 60 * 60 * 1000);
          }
          const timeDifferenceMilliseconds = Math.abs(dateTime2 - dateTime1);
          const hoursDifference = Math.floor(timeDifferenceMilliseconds / (1000 * 60 * 60));
          const minutesDifference = Math.floor((timeDifferenceMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
          const totalMinutesDifference = (hoursDifference * 60) + minutesDifference;
          const timeOutDifferenceMilliseconds = Math.abs(dateTimeOut2 - dateTimeOut1);
          let hoursTimeOutDifference = Math.floor(timeOutDifferenceMilliseconds / (1000 * 60 * 60));
          const minutesTimeOutDifference = Math.floor((timeOutDifferenceMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
          const totalMinutesTimeOutDifference = (hoursTimeOutDifference * 60) + minutesTimeOutDifference;
          let totalUndertimeHours = Math.floor(totalMinutesTimeOutDifference / 60)
          if(dateTimeOut2 > dateTimeOut1){
            totalUndertimeHours += 1
          }
          const formattedHolidayDate = moment(data.date).format("YYYY-MM-DD");
          let holidayFound = await Holidays.findOne({date: formattedHolidayDate}).lean().exec()
          if (timeOnly2 < timeOnly1) {
            if (dateTimeOut2 > dateTimeOut1) {
              if(holidayFound && holidayFound.type != "Special Holiday") {
                legalHoliday = 8
              }
              else {
                legalHoliday = 0
              }
              if(holidayFound && holidayFound.type == "Special Holiday") {
                specialHoliday = data.totalHours - totalUndertimeHours
              }
              else {
                specialHoliday = 0
              }
              records.push({
                _id: id,
                date: date,
                from: data.from,
                to: data.to,
                timeIn: timeIn,
                timeOut: timeOut,
                hourswork: data.totalHours - totalUndertimeHours,
                hoursTardy: totalMinutesDifference,
                overtime: data.otHours,
                nightdiff: data.nightdiff,
                rd: data.restday,
                legalholiday: legalHoliday,
                specialholiday: specialHoliday
              })
            }
            else {
              if(holidayFound && holidayFound.type != "Special Holiday") {
                legalHoliday = 8
              }
              else {
                legalHoliday = 0
              }
              if(holidayFound && holidayFound.type == "Special Holiday") {
                specialHoliday = data.totalHours - totalUndertimeHours
              }
              else {
                specialHoliday = 0
              }
              records.push({
                _id: id,
                date: date,
                from: data.from,
                to: data.to,
                timeIn: timeIn,
                timeOut: timeOut,
                hourswork: data.totalHours,
                hoursTardy: totalMinutesDifference,
                overtime: data.otHours,
                nightdiff: data.nightdiff,
                rd: data.restday,
                legalholiday: legalHoliday,
                specialholiday: specialHoliday
              })
            }
          }
          else {

            if (dateTimeOut2 > dateTimeOut1) {
              if(holidayFound && holidayFound.type != "Special Holiday") {
                legalHoliday = 8
              }
              else {
                legalHoliday = 0
              }
              if(holidayFound && holidayFound.type == "Special Holiday") {
                specialHoliday = data.totalHours - totalUndertimeHours
              }
              else {
                specialHoliday = 0
              }
              records.push({
                _id: id,
                date: date,
                from: data.from,
                to: data.to,
                timeIn: timeIn,
                timeOut: timeOut,
                hourswork: data.totalHours - totalUndertimeHours,
                hoursTardy: 0,
                overtime: data.otHours,
                nightdiff: data.nightdiff,
                rd: data.restday,
                legalholiday: legalHoliday,
                specialholiday: specialHoliday
              })
            }
            else {
              if(holidayFound && holidayFound.type != "Special Holiday") {
                legalHoliday = 8
              }
              else {
                legalHoliday = 0
              }
              if(holidayFound && holidayFound.type == "Special Holiday") {
                specialHoliday = data.totalHours - totalUndertimeHours
              }
              else {
                specialHoliday = 0
              }
              records.push({
                _id: id,
                date: date,
                from: data.from,
                to: data.to,
                timeIn: timeIn,
                timeOut: timeOut,
                hourswork: data.totalHours,
                hoursTardy: 0,
                overtime: data.otHours,
                nightdiff: data.nightdiff,
                rd: data.restday,
                legalholiday: legalHoliday,
                specialholiday: specialHoliday
              })
            } 
          }
        }
        else {
          records.push({
            _id: id,
            date: date,
            from: data.from,
            to: data.to,
            timeIn: 0,
            timeOut: 0,
            hourswork: 0,
            hoursTardy: 0,
            overtime: data.otHours,
            nightdiff: data.nightdiff,
            rd: data.restday,
            legalholiday: legalHoliday,
            specialholiday: 0
          })
        }
      }
      else {
        records.push({
          _id: id,
          date: date,
          from: data.from,
          to: data.to,
          timeIn: 0,
          timeOut: 0,
          hourswork: 0,
          hoursTardy: 0,
          overtime: 0,
          nightdiff: 0,
          rd: 0,
          legalholiday: 0,
          specialholiday: 0
        })
      }
    }))
    records.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
    res.json(records)
  },
  get_all_schedule: async function(req, res) {
    const { company } = req.body;
    if (!company) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    const record = await Payroll.findOne({company: company})
      .lean()
      .exec();
    res.json(record)
  },
  post_announcement: async function(req, res) {
    const { store, title, link, createdBy, uid, img, description} = req.body;
    if (!store || !title || !createdBy || !uid || !img) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    const announcement = new Announcement({
      uid: uid,
      store: store,
      title: title,
      link: link,
      decription: description,
      createdAt: new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`),
      createdBy: createdBy,
      img: img
    });
    result = await Announcement.create(announcement)
    if(result) {
      return res.status(200).json({
        success: true,
        msg: `Announcement save`,
      });
    }
    else {
      return res.status(400).json({
        success: false,
        msg: `Something went wrong please contact your IT administrator`,
      });
    }
  },
  get_announcement: async function(req, res) {
    const { store } = req.body;
    if (!store) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    result = await Announcement.find({store: store}).lean().exec()
    if(result) {
      return res.status(200).json({
        success: true,
        data: result
      });
    }
    else {
      return res.status(400).json({
        success: false,
        msg: `Something went wrong please contact your IT administrator`,
      });
    }
  },
  get_announcement_by_id: async function(req, res) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    result = await Announcement.find({_id: id}).lean().exec()
    if(result) {
      return res.status(200).json({
        success: true,
        data: result
      });
    }
    else {
      return res.status(400).json({
        success: false,
        msg: `Something went wrong please contact your IT administrator`,
      });
    }
  },
  edit_announcement: async function(req, res) {
    const { id, title, link, description} = req.body;
    const data = {
      title: title,
      link: link,
      description: description
    }
    result = await Announcement.updateOne( { _id: id }, data, {upsert: true} ).lean().exec()
    if(result) {
      return res.status(200).json({
        success: true,
        msg: `Announcement updated`,
      });
    }
    else {
      return res.status(400).json({
        success: false,
        msg: `Something went wrong please contact your IT administrator`,
      });
    }
  },
  delete_announcement: async function(req, res) {
    const { id } = req.params;
    result = await Announcement.deleteOne( { _id: id }).lean().exec()
    if(result) {
      return res.status(200).json({
        success: true,
        msg: `Announcement deleted`,
      });
    }
    else {
      return res.status(400).json({
        success: false,
        msg: `Something went wrong please contact your IT administrator`,
      });
    }
  },
  delete_reports: async function(req, res) {
    result = await Reports.find( { date: {$lte: new Date("2022-12-31")} }).lean().exec()

    if(result) {
      return res.status(200).json({
        success: true,
        msg: `Record deleted`,
        data: result
      });
    }
    else {
      return res.status(400).json({
        success: false,
        msg: `Something went wrong please contact your IT administrator`,
      });
    }
  },
  payslip_gateway: async function(req, res) {
    const { id, store } = req.body;
    let record = {};

    try {
      const response = await fetch(`https://payroll-live.sevenstarjasem.com/payroll/public/api/getPayrollInfoV2/${id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store: store
        })
      });
      if (!response.ok) {
        // Handle non-200 responses
        return res.status(response.status).json({
          success: false,
          message: 'Error fetching payroll info',
          error: await response.text() // Get error message from the response
        });
      }

      record = await response.json();
      if (record.success) {
        return res.status(200).json({
          success: true,
          message: 'Record fetched successfully',
          record
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Failed to fetch record',
          record
        });
      }
    } catch (error) {
      console.error('Error fetching payroll info:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },
  edit_company: async function(req, res) {
    const {company} = req.body;
    const formattedResult = []
    const data = {
      company: company,
    }
    const emails = [
      "julienasun0224@gmail.com",
    ]
    emails.map(async email => {
      result = await User.updateOne( { email: email }, data).lean().exec()
      resultEmail = await User.find( { email: email }).lean().exec()
      resultEmail.map(id => {
        console.log(id._id)
      })
    })
    return res.status(200).json({
      formattedResult
    });
  },
  remove_many_schedules: async function(req, res) {
    const {id} = req.params;
    try {
      const result = await Schedule.deleteMany({ uid: id }).lean().exec();
      if (result.deletedCount === 0) {
        return res.status(200).json({
          success: true,
          msg: "No record found",
        });  
      }
      else {
        return res.status(200).json({
          success: true,
          msg: "Record updated",
        }); 
      }      
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: "Something went wrong",
      });
    }
  },
  get_checklist: async function(req, res) {
    const {store} = req.body;
    try {
      const result = await Checklist.find({store: store}).lean().exec();
      if (result.length > 0) {
        return res.status(200).json({
          success: true,
          data: result,
        });    
      }
      else {
        return res.status(200).json({
          success: true,
          data: "No records found",
        });  
      }
       
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  post_checklist: async function(req, res) {
    const {store, checklists} = req.body;
    try {
      let update = {
        $set: { checklists: checklists },
      };
      result = await Checklist.updateOne( { store: store }, update, {upsert: true} ).lean().exec()
      return res.status(200).json({
        success: true,
        msg: "Success",
      });   
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  delete_checklist: async function(req, res) {
    const {store} = req.body;
    try {
      const result = await Checklist.deleteOne({store: store}).lean().exec();
      if (result.deletedCount === 0) {
        return res.status(200).json({
          success: true,
          msg: "No Records found",
        });    
      }
      else {
        return res.status(200).json({
          success: true,
          msg: "Success",
        });  
      }
         
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  verify_password: async function(req, res) {
    const user = await User.findOne({ email: req.body.email , isArchived: false }).lean().exec();
    if (!user) return false;
    let encryptPassword = crypto
      .createHmac("sha1", user.salt)
      .update(req.body.password)
      .digest("hex");

    if (encryptPassword !== user.hashed_password) {
      return res.status(400).json({
        success: false,
        msg: "Fail",
      });
    }
    else {
      return res.status(200).json({
        success: true,
        msg: "Success",
      });  
    }
  },
  get_store: async function(req, res) {
    const {id} = req.params;
    const user = await User.findOne({ _id: id , isArchived: false }).lean().exec();
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "Fail",
      });
    }
    else {
      return res.status(200).json({
        success: true,
        msg: "Success",
        company: user.company
      });  
    }
  },
  update_email: async function(req, res) {
    const {id, email} = req.body;
    const user = await User.findOne({ email: email , isArchived: false }).lean().exec();
    if (user) {
      return res.status(400).json({
        success: false,
        msg: "Email already in use",
      });
    }
    else {
      try {
        let update = {
          $set: { email: email },
        };
        result = await User.updateOne( { _id: id }, update ).lean().exec()
        return res.status(200).json({
          success: true,
          msg: "Success",
        });   
      }
      catch (err) {
        return res.status(400).json({
          success: false,
          msg: err,
        });
      }
    }
  },
  verify_password_phone: async function(req, res) {
    let {password, phone} = req.body;
    let code = Math.floor(100000 + Math.random() * 900000);
    const numberFormat =
      String(phone).charAt(0) +
      String(phone).charAt(1) +
      String(phone).charAt(2);
    if (numberFormat !== "+63") {
      phone = "+63" + phone.substring(1);
    }
    const user = await User.findOne({ phone: phone , isArchived: false }).lean().exec();
    
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "Invalid mobile no. or password",
      });
    }
    else {
      try {
        let encryptPassword = crypto
          .createHmac("sha1", user.salt)
          .update(password)
          .digest("hex");

        if (encryptPassword !== user.hashed_password) {
          return res.status(400).json({
            success: false,
            msg: "Fail",
          });
        }
        else {
          const store = await User.find({
            company: user.company,
          })
          .lean()
          .exec();
          const token = create_token(user._id);
          res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
          res.status(200).json({ ...user, token, store_id: store[0]._id });  
        } 
      } catch (err) {
          return res.status(400).json({
          success: false,
          msg: err,
        });
      }
      
    }
    
  },
  get_schedule_all_v2: async function (req, res) {

    const { id, date } = req.body;
    var dates = []
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
      let employees = await User.find({$and: [{company: user.company, role: 0, isArchived: false}]}, { displayName: 1, lastName: 1, firstName: 1})
        .lean()
        .exec();
      if (!employees) {
        return res.status(200).json({
          success: true,
          msg: "No registered employees",
        });
      }
      const [month, day, year] = date.split('/');
      const formattedDate = new Date(Date.UTC(year, month - 1, day));
      let records = []
      const oldDate = new Date(date);
      oldDate.setUTCHours(16, 0, 0, 0); // Set hours to 16:00:00.000 UTC
      const newDateString = oldDate.toISOString().replace("Z", "+00:00");
      const promises = employees.map(async (data) => {
        const results = await Payroll.find({
          uid: data._id, 
          date: new Date(formattedDate)
        })
        .sort({ from: 1 })
        .lean()
        .exec();

        if (results.length > 0) {
          results.forEach(result => {
            records.push({
              _id: result._id,
              emp: data.displayName,
              position: result.position,
              date: result.date,
              startShift: result.from,
              endShift: result.to,
              totalHours: result.totalHours,
              otHours: result.otHours,
              nightdiff: result.nightdiff,
              restday: result.restday,
              timeIn: 0,
              timeOut: 0
            });
          });
        } else {
          records.push({
            _id: results._id,
            emp: data.displayName,
            position: null,
            date: new Date(date),
            startShift: null,
            endShift: null,
            totalHours: null,
            otHours: 0,
            nightdiff: 0,
            restday: 0,
          });
        }
      });

      await Promise.all(promises);
      let filteredRecords = records
        .filter(record => record.startShift !== null)
        .sort((a, b) => {
          // First compare by startShift
          const startShiftComparison = a.startShift.localeCompare(b.startShift);
          if (startShiftComparison !== 0) {
            return startShiftComparison;
          }
          // If startShift is the same, compare by name
          return a.emp.localeCompare(b.emp);
        });
        return res.status(200).json({
          success: true,
          filteredRecords,
        })
    } catch (err) {
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },

  get_breaklist: async function(req, res) {
    let {from, to, store} = req.body;
    let reportsFound = []
    let records = []
    let timeIn = null
    let timeOut = null
    let hoursWork = null
    let dates = [];
    const startDate = new Date(from)
    const endDate = new Date(to)
    function getDatesBetween(startDate, endDate) {
        const start = moment(startDate);
        const end = moment(endDate);


        if (start.isAfter(end)) {
            throw new Error('startDate must be before or equal to endDate');
        }

        for (let dt = start; dt.isSameOrBefore(end); dt.add(1, 'days')) {
            dates.push(dt.format('YYYY-MM-DD'));
        }

        return dates;
    }
    const dateBetween = getDatesBetween(startDate, endDate)
    try {

      const latestDateToDoc = await Breaklist.findOne({store: store}).sort({ dateto: -1 }).exec();
      const earliestDateFromDoc = await Breaklist.findOne({store: store}).sort({ datefrom: 1 }).exec();


      if (latestDateToDoc && earliestDateFromDoc) {
        const latestDateTo = moment(latestDateToDoc.dateto).startOf('day');
        const earliestDateFrom = moment(earliestDateFromDoc.datefrom).startOf('day');
        const fromDate = moment(from).startOf('day');
        const toDate = moment(to).startOf('day');
      
        // Check if the dates are within the existing date range
        if (
          fromDate.isBetween(earliestDateFrom, latestDateTo, undefined, '[]') ||
          toDate.isBetween(earliestDateFrom, latestDateTo, undefined, '[]')
        ) {
          return res.status(200).json({
            success: false,
            msg: "Invalid Dates. Breaklist date already submitted and saved.",
          });
        }
      }

      let personnels = await User.find({company: store, role:0, isArchived: false})
      .lean()
      .exec();

      // console.log(personnels, 'personnelspersonnels')
      if (personnels.length > 0) {
        const results = await Promise.all(personnels.map(async (data) => {
          await Promise.all(dates.map(async date => {
            let schedulesFound = await Payroll.find({uid: data._id, date: date}).lean().exec()
            let timeIn
            let timeOut
            let legalHoliday = 0
            let specialHoliday = 0
            if (schedulesFound.length > 0) {
              let reportsFound = await Reports.find({uid: schedulesFound[0].uid, date: schedulesFound[0].date}).lean().exec()
              if (reportsFound.length > 0) {

                const hasTimeIn = reportsFound[0].record.some(entry => entry.status === 'time-in');
                const hasTimeOut = reportsFound[0].record.some(entry => entry.status === 'time-out');
                let reportsLength = reportsFound[0].record.length
                if (hasTimeIn && hasTimeOut) {
                    
                  if(typeof reportsFound[0].record[0].time != "number") {
                    let [hours, minutes] = reportsFound[0].record[0].time.split(':').map(part => parseInt(part, 10));
                    let date = new Date();
                    date.setHours(hours);
                    date.setMinutes(minutes);
                    date.setSeconds(0);
                    date.setMilliseconds(0);
                    let timestamp = date.getTime();
                    timeIn = timestamp
                        ? `${moment(timestamp).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`
                        : null;
                  }
                  else {
                    timeIn = `${moment(reportsFound[0].record[0].time).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`   
                  }
                  if(typeof reportsFound[0].record[reportsLength - 1].time != "number") {
                    let [hours, minutes] = reportsFound[0].record[reportsLength - 1].time.split(':').map(part => parseInt(part, 10));
                    let date = new Date();
                    date.setHours(hours);
                    date.setMinutes(minutes);
                    date.setSeconds(0);
                    date.setMilliseconds(0);
                    let timestamp2 = date.getTime();
                    timeOut = timestamp2
                        ? `${moment(timestamp2).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`
                        : null;
                  }
                  else {
                    timeOut = `${moment(reportsFound[0].record[reportsLength - 1].time).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`   
                  }
                  const parsedDate = new Date(timeIn);
                  const [year, month, day] = [
                    parsedDate.getUTCFullYear(),
                    parsedDate.getUTCMonth(),
                    parsedDate.getUTCDate()
                  ];
                  const parsedDateTimeOut = new Date(schedulesFound[0].date);
                  const [timeOutYear, timeOutMonth, timeOutDay] = [
                    parsedDateTimeOut.getUTCFullYear(),
                    parsedDateTimeOut.getUTCMonth(),
                    parsedDateTimeOut.getUTCDate()
                  ];
                  const [hours, minutes] = schedulesFound[0].from.split(':').map(Number);
                  const [hoursTimeOut, minutesTimeOut] = schedulesFound[0].to.split(':').map(Number);
                  const combinedDate = new Date(Date.UTC(year, month, day, hours, minutes));
                  const combinedDate2 = new Date(Date.UTC(timeOutYear, timeOutMonth, timeOutDay, hoursTimeOut, minutesTimeOut));
                  const parsedDate1 = new Date(timeIn);
                  const parsedDate2 = new Date(combinedDate);
                  const parsedDateTimeOut1 = new Date(timeOut);
                  const parsedDateTimeOut2 = new Date(combinedDate2);
                  const timeOnly1 = `${parsedDate1.getUTCHours().toString().padStart(2, '0')}:${parsedDate1.getUTCMinutes().toString().padStart(2, '0')}:${parsedDate1.getUTCSeconds().toString().padStart(2, '0')}`;
                  const timeOnly2 = `${parsedDate2.getUTCHours().toString().padStart(2, '0')}:${parsedDate2.getUTCMinutes().toString().padStart(2, '0')}:${parsedDate2.getUTCSeconds().toString().padStart(2, '0')}`;
                  const timeOutTimeOnly1 = `${parsedDateTimeOut1.getUTCHours().toString().padStart(2, '0')}:${parsedDateTimeOut1.getUTCMinutes().toString().padStart(2, '0')}:${parsedDateTimeOut1.getUTCSeconds().toString().padStart(2, '0')}`;
                  const timeOutTimeOnly2 = `${parsedDateTimeOut2.getUTCHours().toString().padStart(2, '0')}:${parsedDateTimeOut2.getUTCMinutes().toString().padStart(2, '0')}:${parsedDateTimeOut2.getUTCSeconds().toString().padStart(2, '0')}`;
                  const referenceDate = '1970-01-01T';
                  const dateTime1 = new Date(referenceDate + timeOnly1 + 'Z');
                  const dateTime2 = new Date(referenceDate + timeOnly2 + 'Z'); 

                  /*let dateTimeOut1 = new Date(referenceDate + timeOutTimeOnly1 + 'Z');
                  let dateTimeOut2 = new Date(referenceDate + timeOutTimeOnly2 + 'Z');*/
                  let dateTimeOut1 = new Date(parsedDateTimeOut1);
                  let dateTimeOut2 = new Date(parsedDateTimeOut2);
                  if (schedulesFound[0].from < schedulesFound[0].to) {
                    dateTimeOut1 = new Date(referenceDate + timeOutTimeOnly1 + 'Z');
                    dateTimeOut2 = new Date(referenceDate + timeOutTimeOnly2 + 'Z');
                  }
                  else {
                    dateTimeOut1 = new Date(reportsFound[0].record[0]);
                    dateTimeOut2 = new Date(dateTimeOut2.getTime() + 24 * 60 * 60 * 1000);
                  }
                  const timeDifferenceMilliseconds = Math.abs(dateTime2 - dateTime1);
                  const hoursDifference = Math.floor(timeDifferenceMilliseconds / (1000 * 60 * 60));
                  const minutesDifference = Math.floor((timeDifferenceMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
                  const totalMinutesDifference = (hoursDifference * 60) + minutesDifference;
                  const timeOutDifferenceMilliseconds = Math.abs(dateTimeOut2 - dateTimeOut1);
                  let hoursTimeOutDifference = Math.floor(timeOutDifferenceMilliseconds / (1000 * 60 * 60));
                  const minutesTimeOutDifference = Math.floor((timeOutDifferenceMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
                  const totalMinutesTimeOutDifference = (hoursTimeOutDifference * 60) + minutesTimeOutDifference;
                  let totalUndertimeHours = Math.floor(totalMinutesTimeOutDifference / 60)
                  if(dateTimeOut2 > dateTimeOut1){
                    totalUndertimeHours += 1
                  }
                  const formattedHolidayDate = moment(schedulesFound[0].date).format("YYYY-MM-DD");
                  let holidayFound = await Holidays.findOne({date: formattedHolidayDate}).lean().exec()
                  if(holidayFound && holidayFound.type !== "Special Holiday") {
                    legalHoliday += 8
                  }
                  if (timeOnly2 < timeOnly1) {

                    if (dateTimeOut2 > dateTimeOut1) {
                      if(holidayFound && holidayFound.type === "Special Holiday") {
                        specialHoliday = schedulesFound[0].totalHours - totalUndertimeHours
                      }
                      records.push({ 
                        _id: data._id,
                        empName: data.lastName + ", " + data.firstName, 
                        dayswork: 0, 
                        hourswork: schedulesFound[0].totalHours - totalUndertimeHours, 
                        hourstardy: totalMinutesDifference, 
                        overtime: schedulesFound[0].otHours,
                        nightdiff: schedulesFound[0].nightdiff,
                        restday: schedulesFound[0].restday,
                        legalholiday: legalHoliday,
                        specialholiday: specialHoliday
                      });
                    }
                    else {
                      if(holidayFound && holidayFound.type === "Special Holiday") {
                        specialHoliday = schedulesFound[0].totalHours
                      }
                      records.push({ 
                        _id: data._id,
                        empName: data.lastName + ", " + data.firstName, 
                        dayswork: 0, 
                        hourswork: schedulesFound[0].totalHours, 
                        hourstardy: totalMinutesDifference, 
                        overtime: schedulesFound[0].otHours,
                        nightdiff: schedulesFound[0].nightdiff,
                        restday: schedulesFound[0].restday,
                        legalholiday: legalHoliday,
                        specialholiday: specialHoliday
                      });
                    }
                  } else {

                    if (moment(dateTimeOut2).utc().format() > moment(dateTimeOut1).utc().format()) {
                      if(holidayFound && holidayFound.type === "Special Holiday") {
                        specialHoliday = schedulesFound[0].totalHours
                      }
                      records.push({ 
                        _id: data._id,
                        empName: data.lastName + ", " + data.firstName, 
                        dayswork: 0, 
                        hourswork: schedulesFound[0].totalHours - totalUndertimeHours, 
                        hourstardy: 0, 
                        overtime: schedulesFound[0].otHours,
                        nightdiff: schedulesFound[0].nightdiff, 
                        restday: schedulesFound[0].restday,
                        legalholiday: legalHoliday,
                        specialholiday: specialHoliday
                      });
                    }
                    else {
                      if(holidayFound && holidayFound.type === "Special Holiday") {
                        specialHoliday = schedulesFound[0].totalHours
                      }
                      records.push({ 
                        _id: data._id,
                        empName: data.lastName + ", " + data.firstName, 
                        dayswork: 0, 
                        hourswork: schedulesFound[0].totalHours, 
                        hourstardy: 0, 
                        overtime: schedulesFound[0].otHours,
                        nightdiff: schedulesFound[0].nightdiff,
                        restday: schedulesFound[0].restday,
                        legalholiday: legalHoliday,
                        specialholiday: specialHoliday
                      });  
                    }
                    
                  }
                }
                else {
                  records.push({ 
                    _id: data._id,
                    empName: data.lastName + ", " + data.firstName, 
                    dayswork: 0, 
                    hourswork: 0, 
                    hourstardy: 0, 
                    overtime: schedulesFound[0].otHours,
                    nightdiff: schedulesFound[0].nightdiff,
                    restday: schedulesFound[0].restday,
                    legalholiday: legalHoliday,
                    specialholiday: 0
                  });  
                }
              }
              else {
                records.push({ 
                  _id: data._id,
                  empName: data.lastName + ", " + data.firstName, 
                  dayswork: 0, 
                  hourswork: 0, 
                  hourstardy: 0, 
                  overtime: schedulesFound[0].otHours,
                  nightdiff: schedulesFound[0].nightdiff,
                  restday: schedulesFound[0].restday,
                  legalholiday: legalHoliday,
                  specialholiday: 0
                });   
              } 
            }
            else {
              records.push({ 
                _id: data._id,
                empName: data.lastName + ", " + data.firstName, 
                dayswork: 0, 
                hourswork: 0, 
                hourstardy: 0, 
                overtime: 0,
                nightdiff: 0,
                restday: 0 
              });
            }
          }))
        }))
        const uniqueData = {};
        records.forEach(entry => {
            const empId = entry._id;
            if (parseFloat(entry.hourswork) >= 1) {
              entry.dayswork += 1
            }
            else {
              entry.hourswork = 0;
            }
            if (!entry.overtime) {
              entry.overtime = 0
            }
            if (!entry.nightdiff) {
              entry.nightdiff = 0
            }
            if (!entry.restday) {
              entry.restday = 0
            }
            if (!entry.legalholiday) {
              entry.legalholiday = 0
            }
            if (!entry.specialholiday) {
              entry.specialholiday = 0
            }
            if (uniqueData[empId]) {
              uniqueData[empId].hourswork += parseFloat(entry.hourswork);
              uniqueData[empId].hourstardy += parseInt(entry.hourstardy, 10);
              uniqueData[empId].dayswork += parseInt(entry.dayswork, 10);
              uniqueData[empId].overtime += parseInt(entry.overtime, 10);
              uniqueData[empId].nightdiff += parseInt(entry.nightdiff, 10);
              uniqueData[empId].restday += parseInt(entry.restday, 10);
              uniqueData[empId].legalholiday += parseInt(entry.legalholiday, 10);
              uniqueData[empId].specialholiday += parseInt(entry.specialholiday, 10);
            } else {
              uniqueData[empId] = {
                ...entry,
                hourswork: parseFloat(entry.hourswork),
                hourstardy: parseInt(entry.hourstardy, 10),
                dayswork: parseInt(entry.dayswork, 10),
                overtime: parseInt(entry.overtime, 10),
                nightdiff: parseInt(entry.nightdiff, 10),
                restday: parseInt(entry.restday, 10),
                legalholiday: parseInt(entry.legalholiday, 10),
                specialholiday: parseInt(entry.specialholiday, 10),
              }; 

            }
        });

        records = Object.values(uniqueData);
        records.sort(function(a, b){
            if(a.empName < b.empName) { return -1; }
            if(a.empName > b.empName) { return 1; }
            return 0;
        })
        return res.status(200).json({
          success: true,
          msg: "Success",
          data: records
        });
      }  
      else {
        return res.status(400).json({
          success: false,
          msg: "No user found",
        })
      }

    } catch (err) {
        return res.status(400).json({
        success: false,
        msg: "endpoint" + err,
      })
    }
  },
  get_reports_for_breaklist: async function (req, res) {
    let { id, from, to } = req.body
    let dates = []
    let records = []
    const startDate = new Date(from)
    const endDate = new Date(to)
    function getDatesBetween(startDate, endDate) {
        const start = moment(startDate);
        const end = moment(endDate);


        if (start.isAfter(end)) {
            throw new Error('startDate must be before or equal to endDate');
        }

        for (let dt = start; dt.isSameOrBefore(end); dt.add(1, 'days')) {
            dates.push(dt.format('YYYY-MM-DD'));
        }

        return dates;
    }
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
    else {
      const dateBetween = getDatesBetween(startDate, endDate)
      try {
        await Promise.all(dates.map(async date => {
          let result = await Reports.find({uid: mongoose.Types.ObjectId(id), date: date})
          .sort([['date', -1]])
          .limit(1)
          .exec();
          if (result.length === 0) {
            return false
          }
          else {
            const hasTimeIn = result[0].record.some(entry => entry.status === 'time-in');
            const hasTimeOut = result[0].record.some(entry => entry.status === 'time-out');
            if (hasTimeIn && hasTimeOut) {
              let timeInStamp = `${moment(result[0].record[0].time).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`
              let timeOutStamp = `${moment(result[0].record[result.length].time).tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`
              const timeIn = moment(timeInStamp).utc().format('HH:mm');
              const timeOut = moment(timeOutStamp).utc().format('HH:mm');
              records.push({ 
                _id: user._id,
                date: date,
                empName: user.displayName, 
                timein: timeIn, 
                timeout: timeOut,
              }); 
            }
      
          }
        }))
        if (records.length > 0) {
          return res.status(200).json({
            success: true,
            msg: "Success",
            data: records
          });  
        }
        else {
          return res.status(200).json({
            success: true,
            msg: "No records found",
          });
        }
      } catch (err) {
        await logError(err, "Reports", null, id, "GET");
        res.status(400).json({ success: false, msg: err });
        throw new createError.InternalServerError(err);
      }
    }
  },
  remove_breaklist_record: async function (req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        msg: `Record not found ${id}`,
      });
    }

    try {
      await Reports.deleteOne({ _id: mongoose.Types.ObjectId(id) }).then((record) => {
        if (!record)
          return res
            .status(400)
            .json({ success: false, msg: `Unable to remove record ${id}` });
        if (record.deletedCount === 0) {
          return res.status(400).json({
            success: true,
            msg: "No record found",
          }); 
        }
        else {
          return res.status(200).json({
            success: true,
            msg: "Record updated",
          });  
        }
        
      });
    } catch (err) {
      console.log(err);
      await logError(err, "Reports.remove_record", req.body, id, "DELETE");
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  post_save_breaklist: async function (req, res) {
    const {employees, from, to, store, generatedby, employeecount, cutoff} = req.body
    const breaklistId = uuid();

    const data = new Breaklist({
      store: store,
      breaklistid: breaklistId,
      datefrom: from,
      dateto: to,
      generatedby: generatedby,
      employeecount: employeecount,
      cutoff: cutoff
    })

    try {
    
        const promises = employees.map(async (doc) => {
        const { _id, empName, ...rest } = doc;
        // Create new Breaklist document
        const info = new Breaklistinfo({
          store: store,
          breaklistid: breaklistId,
          employeeid: _id,
          employeename: empName,
          ...rest 
        });

        // Save the document
        const result = await info.save();
        return result;
      });

      const results = await Promise.all(promises);

      if (results){
      await data.save();
      }

      /*console.log(`${results} Breaklist documents were inserted`);*/

      return res.status(200).json({
        success: true,
        msg: "Breaklists Saved",
        results: results  // Optionally return inserted documents or IDs
      });
    
    } catch (err) {
      // await logError(err, "Reports", null, breaklistid, "POST");  // Adjusted the method to POST
      console.log(err)

      return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  },

  get_store_breaklist: async function (req, res) {
    const {store} = req.body;

    try {
      const breaklist = await Breaklist.find({ store: store }).sort({ createdAt: -1 }).exec();
      
      console.log('Breaklist retrieved successfully:');
  
      return res.status(200).json({
        success: true,
        data: breaklist
      });

    } catch (err) {
      console.error('Error retrieving breaklist:', err);
  
      return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  },

  get_store_breaklist_pending: async function (req, res) {
    const {store} = req.body;

    try {
      const breaklist = await Breaklist.find({ store: store, approved: false }).sort({ createdAt: -1 }).exec();
      
      console.log('Breaklist retrieved successfully:');
  
      return res.status(200).json({
        success: true,
        data: breaklist
      });

    } catch (err) {
      console.error('Error retrieving breaklist:', err);
  
      return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  },

  get_store_breaklist_approved: async function (req, res) {
    const {  payroll } = req.body;
  
    try {
      let allBreaklists;
  
      if (payroll === 2) {
        allBreaklists = await Breaklist.find({ store: { $regex: /Inhouse/i } }).exec();
      } else {
        allBreaklists = await Breaklist.find({ store: { $not: { $regex: /Inhouse/i } } }).exec();
      }
  
      const approvedBreaklists = allBreaklists.filter(item => {
        return item.approved;
      });
  
      const detailedBreaklist = await Promise.all(approvedBreaklists.map(async (item) => {
        const breaklistDetails = await Breaklistinfo.find({ breaklistid: item.breaklistid }).exec();
        return {
          ...item._doc,
          details: breaklistDetails
        };
      }));
  
      const totalBreaklist = allBreaklists.length;
      const totalApproved = approvedBreaklists.length;
  
      /*console.log(detailedBreaklist, 'Breaklist retrieved successfully:');
  */
      return res.status(200).json({
        success: true,
        data: detailedBreaklist,
        summary: {
          totalBreaklist: totalBreaklist,
          totalApproved: totalApproved
        }
      });
  
    } catch (err) {
      console.error('Error retrieving breaklist:', err);
  
      return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  },
  
  get_breaklistinfo: async function (req, res) {
    const {breaklistid} = req.body;

    try {
      const breaklistinfo = await Breaklistinfo.find({breaklistid: breaklistid}).exec();
      
      console.log('Breaklistinfo retrieved successfully:');
      breaklistinfo.sort(function(a, b){
          if(a.employeename < b.employeename) { return -1; }
          if(a.employeename > b.employeename) { return 1; }
          return 0;
      })
      return res.status(200).json({
        success: true,
        data: breaklistinfo
      });

    } catch (err) {
      console.error('Error retrieving breaklist:', err);
  
      return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  },
  
  delete_breaklist: async function(req, res) {
    const {breaklistid} = req.body;
    try {
      const breaklistResult = await Breaklist.deleteOne({breaklistid: breaklistid}).lean().exec();
      
      const breaklistinfoResult= await Breaklistinfo.deleteMany({breaklistid: breaklistid}).lean().exec();
      if (breaklistResult.deletedCount === 0 || breaklistinfoResult.deletedCount === 0){
        return res.status(200).json({
          success: true,
          msg: "No Records found",
        });    
      }
      else {
        return res.status(200).json({
          success: true,
          msg: "Success",
        });  
      }
         
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  post_approve_breaklist: async function(req, res) {
    const { email, breaklistid, token, approver } = req.body;
    try {
      /*let breaklist = await Breaklist.findOne({ breaklistid: breaklistid })
        .lean()
        .exec();
      if (!breaklist) {
        return res.status(400).json({
          success: false,
          msg: "No such breaklist",
        });
      }
      else {
        let update = {
          $set: { approved: true, approvedby:  },
        };
        result = 
        await Breaklist.findOneAndUpdate(
          { breaklistid: breaklistid },
           update
        );
        if (result) {
          return res.status(200).json({
            success: true,
            msg: "Update successfull",
          });  
        }*/
      const findTokenResult = await User.findOne({email: email}).select("timeAdjustmentVerification")
      if(findTokenResult){
        const tokenStored = findTokenResult.timeAdjustmentVerification
        if(tokenStored === token){
          let breaklist = await Breaklist.findOne({ breaklistid: breaklistid })
            .lean()
            .exec();
          if (!breaklist) {
            return res.status(400).json({
              success: false,
              msg: "No such breaklist",
            });
          }
          else {
            let update = {
              $set: { approved: true, approvedby: approver },
            };
            result = 
            await Breaklist.findOneAndUpdate(
              { breaklistid: breaklistid },
               update
            );
            if (result) {
              return res.status(200).json({
                success: true,
                msg: "Update successfull",
              });  
            }
          }  
        }
        else {
          return res.status(200).json({
            success: false,
            message: "OTP is invalid"
          })
        }
      }
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
/*  archived_many_users: async function (req, res) {
    try {
      const breaklist = await User.updateMany({ store: "PPRE Corporation" }, { isArchived: true }).exec();
      
      console.log('Archived successfully:');

    } catch (err) {
      console.error('Error retrieving breaklist:', err);
  
      return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  },*/
  delete_schedule: async function (req, res) {
    const { id } = req.params;
    if (!id)
      res
        .status(400)
        .json({ success: false, msg: `Missing Request parameters.` });
    try {
      const schedule = await Payroll.deleteOne({ _id: id }).lean().exec(); 
      return res.status(200).json({
        success: true,
        msg: "Delete successfull",
      });  
    } catch (err) {
      return res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
  },
  edit_schedule: async function(req, res) {
    const { id, ot, rd, nightdiff } = req.body;
    try {
      let schedule = await Payroll.findOne({ _id: id })
        .lean()
        .exec();
      if (!schedule) {
        return res.status(400).json({
          success: false,
          msg: "No such schedule",
        });
      }
      else {
        let update = {
          $set: { otHours: ot, restday: rd, nightdiff: nightdiff },
        };
        result = 
        await Payroll.findOneAndUpdate(
          { _id: id },
           update
        );

        if (result) {
          return res.status(200).json({
            success: true,
            msg: "Update successfull",
          });  
        }
      }
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  get_new_store_account: async function(req, res) {
    try {
      let stores = await User.find({
        role: { $lte: 3 },
        isArchived: true,
        isVerified: true,
        createdAt: { $gt: new Date('2024-09-26') }
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
      if (!stores) {
        return res.status(400).json({
          success: false,
          msg: "No stores found",
        });
      }
      else {
        return res.status(200).json({
          success: true,
          data: stores
        });  
      }
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  approve_new_store_account: async function(req, res) {
    const { id } = req.params
    try {
      let user = await User.findOneAndUpdate(
        {
          _id: id,
          isArchived: true,
          isVerified: true,
          role: { $lte: 3 },
        },
        {
          $set: { isArchived: false }
        },
        { new: true }
      )
        .lean()
        .exec();
      if (!user) {
        return res.status(400).json({
          success: false,
          msg: "No user found",
        });
      }
      else {
        let transporter = nodemailer.createTransport({
           host: process.env.SES_HOST,
           port: 587,
           secure: false,
           auth: {
             user: process.env.SES_USER,
             pass: process.env.SES_PASS,
           },
         });
        let mailOptions = {
          from: 'no-reply@sparkletimekeeping.com',
          to: user.email,
          subject: 'Account activated',
          html: emailAccountVerifiedHTML()
        };
        transporter.sendMail(mailOptions, function(error, info){
          if (error) {
            return res.status(400).json({
              success: false,
              msg: error,
            });
          } else {
            return res.status(200).json({
              success: true,
              msg: "Store account activated."
            });
          }
        });
  
      }
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  decline_new_store_account: async function(req, res) {
    const { id } = req.params;
    try {
      // Find and delete the user with the specified conditions
      let user = await User.findOneAndDelete({
        _id: id,
        isArchived: true,
        isVerified: true,
        role: { $lte: 3 },
      }).lean();

      if (!user) {
        return res.status(400).json({
          success: false,
          msg: "No user found",
        });
      } else {
        return res.status(200).json({
          success: true,
          msg: "Store account activation declined.",
        });
        // Set up nodemailer transporter for email notification
/*        let transporter = nodemailer.createTransport({
          host: process.env.SES_HOST,
          port: 587,
          secure: false,
          auth: {
            user: process.env.SES_USER,
            pass: process.env.SES_PASS,
          },
        });

        let mailOptions = {
          from: 'no-reply@sparkletimekeeping.com',
          to: user.email,
          subject: 'Account activation unsuccessful',
          html: emailAccountActivationFailHTML(),
        };

        // Send email
        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            return res.status(400).json({
              success: false,
              msg: error,
            });
          } else {
            return res.status(200).json({
              success: true,
              msg: "Store account activation declined and user notified via email.",
            });
          }
        });*/
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  edit_user_name: async function(req, res) {
    const { id } = req.params
    const { firstName, lastName } = req.body
    try {
      let user = await User.findOneAndUpdate(
        {
          _id: id,
          isArchived: false,
          role: 0,
        },
        {
          $set: {
            firstName: firstName,
            lastName: lastName,
            displayName: `${firstName} ${lastName}`,
          },
        },
        { new: true }
      )
        .lean()
        .exec();
      if (!user) {
        return res.status(400).json({
          success: false,
          msg: "No user found",
        });
      }
      else {
        return res.status(200).json({
          success: true,
          msg: "User display name updated."
        });
      }
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  edit_user_company: async function(req, res) {
    const { id } = req.params
    const { company } = req.body
    try {
      let user = await User.findOneAndUpdate(
        {
          _id: id,
          isArchived: false,
          role: 0,
        },
        {
          $set: {
            company: company,
          },
        },
        { new: true }
      )
        .lean()
        .exec();
      if (!user) {
        return res.status(400).json({
          success: false,
          msg: "No user found",
        });
      }
      else {
        return res.status(200).json({
          success: true,
          msg: "User company name updated.",
          data: user
        });
      }
    }
    catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err,
      });
    }
  },
  delete_user: async function(req, res) {
    const { id } = req.params;
    try {
      let user = await User.findOneAndDelete({
        _id: id,
        isArchived: false,
        role: 0
      }).lean().exec();

      if (!user) {
        return res.status(400).json({
          success: false,
          msg: "No user found or user already archived.",
        });
      } else {
        return res.status(200).json({
          success: true,
          msg: "User successfully deleted.",
          data: user
        });
      }
    }
    catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        msg: "An error occurred during deletion.",
        error: err.message
      });
    }
  },
  get_logs_by_id: async function (req, res) { 
    const { id } = req.params;

    if (!id) return res.status(404).json({ success: false, msg: `No such user.` });

    try {
      let report = await Adjustment.find({
        uid: mongoose.Types.ObjectId(id),
      })
      .limit(50)
      .lean()
      .exec();

      if (report.length === 0) {
        return res.status(201).json({
          success: true,
          msg: "No Records",
        });
      } else {
        return res.json(report);
      }
    } catch (error) {
      return res.status(500).json({ success: false, msg: 'Server error' });
    }
  },
  register_store: async function (req, res) { 
    const { uid, storeid } = req.body;

    if (!storeid) return res.status(404).json({ success: false, msg: `No such user.` });

    try {
      let report = await User.findOne({
        _id: mongoose.Types.ObjectId(storeid),
      })
      .lean()
      .exec();
      if (report.length === 0) {
        return res.status(201).json({
          success: true,
          msg: "No Records",
        });
      } else {
        let update = {
          $addToSet: { store: report.company },
        };

        try {
          result = await Group.findOneAndUpdate(
            { groupid: uid },
            update,
            { upsert: true, new: true }
          )
          .then((updatedDocument) => {
            return res.status(200).json({
              success: true,
              msg: "Success",
            });
          })
          .catch((error) => {
            return res.status(400).json({
              success: false,
              msg: error,
            });
          });
        } catch (error) {
          return res.status(400).json({
            success: false,
            msg: error,
          });
        }

      }
    } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, msg: 'Server error' });
    }
  },
  get_group_store: async function (req, res) { 
    const { id } = req.params;

    if (!id) return res.status(404).json({ success: false, msg: `No such user.` });

    try {
      let report = await Group.findOne({
        groupid: mongoose.Types.ObjectId(id),
      })
      .lean()
      .exec();
      if (!report) {
        return res.status(201).json({
          success: true,
          msg: "No Records",
        });
      } else {
        return res.status(200).json({
          success: true,
          report,
        });
      }
    } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, msg: 'Server error' });
    }
  },

  get_schedule_all_v2_bystore: async function (req, res) {
    const { store, date } = req.body;

    if (!store || !date) {
      return res.status(400).json({ success: false, msg: `Invalid Request parameters.` });
    }

    try {
      const [month, day, year] = date.split('/');
      const formattedDate = new Date(Date.UTC(year, month - 1, day));

      const results = await Payroll.find({
        company: store,
        date: formattedDate,
      })
        .sort({ from: 1 })
        .lean()
        .exec();
      const records = results.map((result) => ({
        _id: result._id,
        emp: result.name || "Unknown",
        position: result.position || "Unassigned",
        date: result.date,
        startShift: result.from,
        endShift: result.to,
        totalHours: result.totalHours,
        otHours: result.otHours || 0,
        nightdiff: result.nightdiff || 0,
        restday: result.restday || 0,
        timeIn: 0,
        timeOut: 0,
      }));

      if (records.length === 0) {
        records.push({
          _id: null,
          emp: "No Employee Found",
          position: null,
          date: formattedDate,
          startShift: null,
          endShift: null,
          totalHours: null,
          otHours: 0,
          nightdiff: 0,
          restday: 0,
          timeIn: 0,
          timeOut: 0,
        });
      }

      const filteredRecords = records
        .filter((record) => record.startShift !== null)
        .sort((a, b) => {
          // Compare by startShift
          const shiftComparison = a.startShift.localeCompare(b.startShift);
          return shiftComparison !== 0 ? shiftComparison : a.emp.localeCompare(b.emp);
        });

      return res.status(200).json({
        success: true,
        filteredRecords,
      });
    } catch (err) {
      await logError(err, "Reports", null, null, "GET");
      res.status(500).json({ success: false, msg: "Internal Server Error", error: err.message });
    }
  },
  get_reports_rangev2_bystore: async function (req, res) {

    const { store, startDate, endDate } = req.body;
    var dates = []
    for (var d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
      dates.push(moment(d).format('YYYY-MM-DD'))
    }
    if (!store || !startDate || !endDate )
      res
        .status(404)
        .json({ success: false, msg: `Invalid Request parameters.` });
    try {
      let employees = await User.find({$and: [{company: store, role: 0, isArchived: false}]}, { displayName: 1, lastName: 1, firstName: 1})
        .lean()
        .exec();
      let count = employees.length 
      if (!employees) {
        return res.status(200).json({
          success: true,
          msg: "No registered employees",
        });
      }
      let records = []
      let d = []
      let finalReports = []
      let reports = []
/*      employees.map(async data => {
        console.log(data)
        let result = await Reports.find({uid: data._id}).lean().exec()
        records.push({Employee: data, reports: result, count: count })
      })*/

      employees.map(data => {
       dates.map(date => {
          const result = Reports.find({$and: [{uid: data._id}, {date: date}]}).lean().exec()
          d.push({date: date})  
        })
      })

      employees.map(async data => {
       dates.map(async date => {
          const result = await Reports.find({$and: [{uid: data._id}, {date: date}]}).lean().exec()
          records.push({Employee: data, date: date, reports:result, count: count})  
        })
      })


      let reportsv2 = await Reports.findOne({}).lean().exec()
/*      dates.map(date => {
        console.log(date)
        const filterResult = records.filter((data, key) => {
          console.log(data.reports[0])
          if (data.reports !== null) {
            if (moment(data.reports.date).format('YYYY-MM-DD') === moment(date).format('YYYY-MM-DD')) {
              finalReports.push(filterResult)   
            }  
          }
        })
      })*/

/*      records.sort(function(a,b){
        return new Date(a.date) - new Date(b.date);
      });  */


      records.sort(function(a, b){
          if(a.Employee.lastName < b.Employee.lastName) { return -1; }
          if(a.Employee.lastName > b.Employee.lastName) { return 1; }
          return 0;
      })
      return res.json({data: records, l: d.length}); 
    } catch (err) {
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },

  updateBreaklist: async function (req, res) {
    const { updatedData } = req.body;

    if (!Array.isArray(updatedData) || updatedData.length === 0) {
      return res.status(400).send({
        message: 'Invalid input: updatedData must be a non-empty array.',
      });
    }

    try {
      // Perform updates concurrently
      const updateResults = await Promise.all(
        updatedData.map(async (data) => {
          const { breaklistid, ...updateFields } = data;

          // Validate breaklistid
          if (!breaklistid) {
            return { breaklistid: null, status: 'failed', error: 'breaklistid is missing' };
          }

          try {
            // Update record
            const updatedBreaklist = await Breaklistinfo.findOneAndUpdate(
              { 
                breaklistid: breaklistid,
                employeeid: updateFields.employeeid,
              }, // Find record by ID
              {
                overtime: updateFields.overtime,
                nightdiff: updateFields.nightdiff,
                restday: updateFields.restday,
              }, // Fields to update
              { new: true } // Return the updated document
            );

            if (!updatedBreaklist) {
              return { breaklistid, status: 'failed', error: 'Breaklist not found' };
            }

            return { breaklistid, status: 'success', data: updatedBreaklist };
          } catch (error) {
            return { breaklistid, status: 'failed', error: error.message };
          }
        })
      );

      // Send detailed results in the response
      res.status(200).send({
        message: 'Update completed',
        results: updateResults, // Include details of each update operation
      });
    } catch (error) {
      // Catch unexpected errors
      res.status(500).send({
        message: 'An error occurred during the update process.',
        error: error.message,
      });
    }
  },
  post_holiday: async function (req, res) { 
      const { holiday, type, date } = req.body;

      if (!date) return res.status(400).json({ success: false, msg: `Date is required.` });

      try {
        let existingHoliday = await Holidays.findOne({ date }).lean().exec();
        if (existingHoliday) {
          return res.status(200).json({
            success: true,
            msg: "Date already saved.",
          });
        } 
        const newHoliday = new Holidays({ holiday, type, date });
        await newHoliday.save();
        return res.status(201).json({
          success: true,
          msg: "Holiday saved successfully.",
        });
      } catch (error) {
        return res.status(500).json({ 
          success: false, 
          msg: 'Server error', 
          error: error.message 
        });
      }
    },

}
module.exports = controllers;