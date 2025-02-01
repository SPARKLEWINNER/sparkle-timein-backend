const createError = require("http-errors");
const stringCapitalizeName = require("string-capitalize-name");
const mongoose = require("mongoose");
const User = require("../models/Users");
const logError = require("../services/logger");
const nodemailer = require("nodemailer");
const {emailVerificationHTML} = require("../helpers/timeAdjustMailFormat");
const {breaklistVerificationHTML} = require("../helpers/generateBreaklist");
const axios = require("axios");

var controllers = {
  get_user: async function (req, res) {
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });

    try {
      const result = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
        .lean()
        .exec();
      if (!result)
        res.status(201).json({ success: false, msg: `No such user.` });
      res.json(result);
    } catch (err) {
      await logError(err, "Store", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_users: async function (req, res) {
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });

    const store = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
      .lean()
      .exec();

    if (!store)
      res.status(404).json({ success: false, msg: `No such store found.` });

    try {
      const result = await User.find({ company: store.company, role:0, isArchived: false }).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(200).json(result);
    } catch (err) {
      await logError(err, "Stores", null, id, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  get_users_list: async function (req, res) {
    try {
      const result = await User.find({ role: 0 }).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(200).json(result);
    } catch (err) {
      await logError(err, "Stores", null, id, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  get_store_lists: async function (req, res) {
    try {
      const result = await User.find({ role: 1 }).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(200).json(result);
    } catch (err) {
      await logError(err, "Stores", null, id, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  get_users_archived: async function (req, res) {
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });

    const store = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
      .lean()
      .exec();

    if (!store)
      res.status(404).json({ success: false, msg: `No such store found.` });

    try {
      const result = await User.find({ company: store.company, $or: [ { isArchived: true}, { isArchived: null } ] }).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(200).json(result);
    } catch (err) {
      await logError(err, "Stores", null, id, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  update_user: async function (req, res) {
    const { firstName, lastName, password, company, position, email, phone } =
      req.body;
    const { id } = req.params;

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }

    try {
      await User.findOne({ _id: mongoose.Types.ObjectId(id) }).then((user) => {
        if (!user)
          return res
            .status(400)
            .json({ success: false, msg: `User not found ${id}` });

        user.password = password;
        user.firstName = firstName;
        user.lastName = lastName;
        user.displayName = firstName + " " + lastName;
        user.isVerified = true;
        user.isOnBoarded = true;
        user.company = company;
        user.position = position;
        user.email = email;
        user.phone = phone;

        user.save().then((result) => {
          if (!result)
            return res
              .status(400)
              .json({ success: false, msg: `Unable to update details ${id}` });

          return res.json(result);
        });
      });
    } catch (err) {
      console.log(err);
      await logError(err, "Stores", req.body, id, "PATCH");
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  archive_user: async function (req, res) {
    const { id, user_id } = req.params;

    if (!id || !user_id) {
      return res.status(400).json({
        success: false,
        msg: `User not found ${id}`,
      });
    }

    try {
      await User.findOne({ _id: mongoose.Types.ObjectId(user_id) }).then((user) => {
        if (!user)
          return res
            .status(400)
            .json({ success: false, msg: `User not found ${user_id}` });

        user.isArchived = true;

        user.save().then((result) => {
          if (!result)
            return res
              .status(400)
              .json({ success: false, msg: `Unable to update details ${user_id}` });

          return res.status(200).json({
            success: true,
            msg: "User deleted."
          });
        });
      });
    } catch (err) {
      console.log(err);
      await logError(err, "Stores.archive_user", req.body, user_id, "PATCH");
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  restore_user: async function (req, res) {
    const { id, user_id } = req.params;

    if (!id || !user_id) {
      return res.status(400).json({
        success: false,
        msg: `User not found ${id}`,
      });
    }
    try {
      const result = await User.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(user_id) },
        { isArchived: false },
        { 
          new: true,
          upsert: true
        }
      ).exec();
      if (!result)
        return res
          .status(400)
          .json({ success: false, msg: `Unable to update details ${user_id}` });

      return res.json(result);
/*      await User.findOne({ _id: mongoose.Types.ObjectId(user_id) }).then((user) => {
        if (!user)
          return res
            .status(400)
            .json({ success: false, msg: `User not found ${user_id}` });

        user.isArchived = false;

        user.save().then((result) => {
          if (!result)
            return res
              .status(400)
              .json({ success: false, msg: `Unable to update details ${user_id}` });

          return res.json(result);
        });
      });*/
    } catch (err) {
      console.log(err);
      await logError(err, "Stores.archive_user", req.body, user_id, "PATCH");
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  remove_user: async function (req, res) {
    const { id, user_id } = req.params;

    if (!id || !user_id) {
      return res.status(400).json({
        success: false,
        msg: `User not found ${id}`,
      });
    }

    try {
      await User.deleteOne({ _id: mongoose.Types.ObjectId(user_id) }).then((user) => {
        if (!user)
          return res
            .status(400)
            .json({ success: false, msg: `Unable to remove user ${user_id}` });

        return res.json(user);
      });
    } catch (err) {
      console.log(err);
      await logError(err, "Stores.remove_user", req.body, user_id, "DELETE");
      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  get_users_branch: async function (req, res) {
    const { id } = req.params
    try {
      const result = await User.find({ role: 5, parentCompany: id }).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }

      return res.status(200).json(result);
    } catch (err) {
      await logError(err, "Stores", null, id, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },

  get_users_store: async function (req, res) {
    const { company } = req.body
    let mailOptions = {}
    try {
      const result = await User.find({ role: 1, company: company }).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }

      return res.status(200).json(result);
    } catch (err) {
      await logError(err, "Stores", null, id, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },


  timeAdjustmentSendOtp: async function (req, res) {
    try {
      const { email, breaklist } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const token = Math.trunc(Math.random() * 999999);

      // Update the user's token
      const storeTokenResult = await User.findOneAndUpdate(
        { email },
        { $set: { timeAdjustmentVerification: token } },
        { new: true }
      );
      console.log(storeTokenResult.company)
      if (!storeTokenResult) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Create transporter for nodemailer (optional if Resend is used)
      const transporter = nodemailer.createTransport({
        host: process.env.SES_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SES_USER,
          pass: process.env.SES_PASS,
        },
      });

      // Send email via Resend API
      const sendEmail = async (subject, htmlTemplate) => {
        try {
          await axios.post(
            'https://api.resend.com/emails',
            {
              from: 'no-reply@sparkletimekeeping.com',
              to: email,
              subject,
              html: htmlTemplate,
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.RESEND_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );
        } catch (error) {
          console.error("Error sending email:", error);
          throw new Error("Failed to send email");
        }
      };

      const subject = breaklist ? 'Breaklist OTP' : 'Sparkletimekeeping OTP';
      const htmlTemplate = breaklist
        ? breaklistVerificationHTML({ verificationToken: token, store: storeTokenResult.company })
        : emailVerificationHTML({ verificationToken: token, store: storeTokenResult.company });

      await sendEmail(subject, htmlTemplate);

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });

    } catch (error) {
      console.error("Error in timeAdjustmentSendOtp:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  timeAdjustmentVerification: async function( req, res){
    try{
      const {email, token} = req.body

      if(!email || !token){
        return res.status(400).json({
          success: false,
          message: "Check email or token payload because undefined"
        })
      }

      const findTokenResult = await User.findOne({email: email}).select("timeAdjustmentVerification")

      if(findTokenResult){
        const tokenStored = findTokenResult.timeAdjustmentVerification
        if(tokenStored === token){
          const updateStatus = await User.findOneAndUpdate(
            {email:email}, 
            {$set:{isTimeAdjustmentVerified: true}},
            {new:true}
          )
          if(updateStatus){
            return res.status(200).json({
              success: true,
              message: "verified successfully"
            })
          }
        }
        return res.status(409).json({
          success: false,
          message: "OTP is invalid"
        })
      }
      return res.status(404).json({
        success: false,
        message:"Not found email"
      })
    }catch(error){
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        body: error
      })
    }
  },

  get_users_bystore: async function (req, res) {
    const { store } = req.body;
    if (!store) res.status(200).json({ success: false, msg: `No such user.` });

    try {
      const result = await User.find({ company: store, role:0, isArchived: false }).lean().exec();
      if (!result) {
        res.status(200).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(200).json(result);
    } catch (err) {
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },

  get_archivedusers_bystore: async function (req, res) {
    const { store } = req.body;
    if (!store) res.status(404).json({ success: false, msg: `No such user.` });

    try {
      const result = await User.find({ company: store, role:0, isArchived: true }).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(200).json(result);
    } catch (err) {
      await logError(err, "Stores", null, id, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
};

module.exports = controllers;
