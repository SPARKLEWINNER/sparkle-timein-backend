const fetch = require('node-fetch');
const createError = require("http-errors");
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/Users");
const Reports = require("../models/Reports");
const Payroll = require("../models/Payroll");
const Coc = require("../models/Coc");
const Tokens = require("../models/Tokens");
const logError = require("../services/logger");
const mailer = require("../services/mailer");
const moment = require('moment-timezone');
const uuid = require("uuid").v1;
const Schedule = require("../models/Schedule");
const Announcement = require("../models/announcements");
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
    console.log('PREVIOUS', previous);
    console.log('REPORT_TIME', now);
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
        createdAt: now,
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
          const response = await fetch('https://payroll.sparkles.com.ph/api/attendance', {
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
          $set: { status: status },
          $push: { record: newReports },
        };
        result = 
        await Reports.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(previous) },
           update
        );
        // await Reports.findOneAndUpdate(
        //   { date: new Date(previous), uid: mongoose.Types.ObjectId(id) },
        //   update,
        //   { sort: { 'updatedAt': -1 } }
        // );

        // check if existing time in / time out
      } else {
        result = await Reports.create(reports);
        const response = await fetch('https://payroll.sparkles.com.ph/api/attendance', {
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
      const response = await fetch('https://payroll.sparkles.com.ph/api/attendance', {
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
        res.json(result);  
      } 
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
      let OneDay = result.slice(-1).pop().createdAt.getTime() + (1 * 24 * 60 * 60 * 1000)
      let DateToday = now.getTime()
      if (result.slice(-1).pop().status !== "time-out" && DateToday >= OneDay) {
        let month = now.getUTCMonth() + 1;
        let day = now.getUTCDate();
        let year = now.getUTCFullYear();
        let time = Date.now();
        let newReports = {
          dateTime: now,
          status: "time-out",
          month: month,
          day: day,
          year: year,
          time: time,
          date: new Date(),
          location: "N/A",
          address: "N/A",
          ip: "Test"
        };

        let update = {
          $set: { status: "time-out" },
          $push: { record: newReports },
        };
        /*result = */
        await Reports.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(result.slice(-1).pop()._id) },
          update
        );
      }
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
      let employees = await User.find({ company: user.company, role: 0, isArchived: false}, { displayName: 1, lastName: 1, firstName: 1})
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
      let finalReports = []
      let reports = []
/*      employees.map(async data => {
        console.log(data)
        let result = await Reports.find({uid: data._id}).lean().exec()
        records.push({Employee: data, reports: result, count: count })
      })*/
      employees.map(data => {
        dates.map(date => {
          let result = Reports.find({"$and": [{uid: data._id}, {date: date}]})
          .lean()
          .exec();

          records.push({Employee: data, date: date, reports:result, count: count }) 
        })
      })
      let reportsv2 = Reports.findOne({}).lean().exec()
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
      return res.json({data: records, v: records.length}); 
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
      await logError(err, "Reports", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_reports_bydate: async function (req, res) {
    const { id, date } = req.params
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
    const { timein, timeout, breakin, breakout } =
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
      return res.status(200).json({
        success: true,
        msg: "Record updated",
      });
    } catch (err) {
      console.log(err);
      await logError(err, "Reports", req.body, id, "PATCH");

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
    const { store, date } = req.params;
    let records = [];
    if (!store || !date)
      res
        .status(404)
        .json({ success: false, msg: `Invalid Request parameters.` });
    try {
      let employees = await User.find({ company: store, role: 0, isArchived: false}, { _id: 1, displayName: 1 })
        .lean()
        .exec();
      if (!employees) {
        return res.status(200).json({
          success: true,
          msg: "No registered employees",
        });
      }
      let counter = 0
      employees.map(async (data) => {
        const report = await Reports.find({ "$and": [{ uid: data._id }, { date: date }] }).sort({ date: -1 })
          .lean()
          .exec();
        if (report.length > 0) {
          counter = counter + 1
        }
        records.push({ Employee: data, Records: report, count: counter})
      });
      
      let reportsv2 = await Reports.findOne({}).lean().exec()
      return res.json(records);
    } catch (err) {
      await logError(err, "Reports.get_reports_store", null, store, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
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
        "user.company": new RegExp("syzygy", 'i'),
        "createdAt": {
            $gte: new Date('2023-04-01'),
            $lte: new Date('2023-04-31')
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
    const { uid, from, to, date, name, company, totalHours } = req.body;
    if (!uid || !from || !to || !date || !name || !company || !totalHours) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    let update = {
      $set: { from: from, to: to, name: name, company: company, totalHours: totalHours},
    };
    result = await Payroll.updateOne( { uid: uid, date: new Date(date) }, update, {upsert: true} ).lean().exec()
    const body = {
        "emp_id": uid,
        "time_in": from,
        "total_hours" : totalHours,
        "time_out": to,
        "date": date,
    }
    const response = await fetch('https://payroll.sparkles.com.ph/api/schedule', {
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
    const record = await Payroll.find({uid: mongoose.Types.ObjectId(id)}).sort({date: 1})
      .lean()
      .exec();
    res.json(record)
  },
  get_schedule_range: async function(req, res) {
    const { id, from, to } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }
    let formattedDate = new Date(to);
    formattedDate.setDate(formattedDate.getDate() + 1);
    const record = await Payroll.find({uid: mongoose.Types.ObjectId(id), date: {$gte: new Date(from), $lte: new Date(formattedDate) }}).sort({date: 1})
      .lean()
      .exec();
    res.json(record)
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
}

module.exports = controllers;
