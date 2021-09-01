"use strict";
const jwt = require("jsonwebtoken"); // to generate signed token
const expressJwt = require("express-jwt"); // for authorization check
const User = require("../models/Users");
const mongoose = require("mongoose");
const send_sms = require("../services/twilio");
const querystring = require("querystring");
const logError = require("../services/logger");

var controllers = {
  require_sign_in: function (req, res, next) {
    expressJwt({
      secret: process.env.JWT_SECRET,
      userProperty: "auth",
      algorithms: ["sha1", "RS256", "HS256"],
    });
    next();
  },
  is_authenticated: function (req, res, next) {
    console.log(req.profile, req.auth);
    // let user = req.profile && req.auth && req.profile._id == req.auth._id;
    // if (!user) {
    //   return res.status(403).json({
    //     error: "Access denied",
    //   });
    // }
    next();
  },
  sign_in: async function (req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, msg: `Missing email or password field!` });
      return;
    }

    try {
      const user = await User.find({ email: email }).lean().exec();
      if (!user) {
        res.status(201).json({ success: false, msg: `Invalid credentials!` });
        return;
      }

      user.hashed_password = user.salt = undefined;

      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
      res.cookie("t", token, { expire: new Date() + 9999 });

      if (user.role === 0) {
        return res.json({ token, ...user[0] });
      } else {
        return res.json({ token, ...user[0], isAdmin: true });
      }
    } catch (err) {
      await logError(err, "Auth", null, id, "POST");
      res.status(400).json({ success: false, msg: err });
    }
  },
  sign_out: function (req, res) {
    res.clearCookie("t");
    res.json({ message: "Sign out success" });
  },
  sign_up: async function (req, res) {
    let { email, firstName, lastName, phone, company } = req.body;

    if (!email || !firstName || !lastName || !phone || !company)
      return res.status(400).json({
        success: false,
        msg: "Please provide fields",
      });

    const now = new Date();
    let code = null;
    const numberFormat =
      String(phone).charAt(0) +
      String(phone).charAt(1) +
      String(phone).charAt(2);
    if (numberFormat !== "+63") {
      phone = "+63" + phone.substring(1);
    }

    const user = await User.find({ email: email }).lean().exec();
    if (user.length !== 0)
      return res.status(400).json({
        success: false,
        msg: "Email already exists",
      });

    try {
      let _params = {
        firstName: firstName,
        lastName: lastName,
        displayName: `${firstName} ${lastName}`,
        email: email,
        company: company,
        phone: phone,
        verificationCode: code,
        createdAt: now.toISOString(),
        hashed_password: undefined,
        salt: undefined,
        role: 1, // store registration
        isOnBoarded: true,
        isVerified: true,
      };

      let new_user = new User(_params);
      try {
        let result = await User.create(new_user);
        if (!result) {
          res.status(400).json({
            success: false,
            msg: "Unable to sign up",
          });
        }

        // await send_sms(phone, `Sparkle Time in verification code ${code}`);/
        const token = jwt.sign({ _id: result._id }, process.env.JWT_SECRET);
        let response = {
          ...result._doc,
          isVerified: true,
          isOnBoarded: true,
          token,
        };

        res.json(response);
      } catch (err) {
        await logError(err, "Auth", req.body, null, "POST");
        res.status(400).json({
          success: false,
          msg: "Unable to sign up",
        });
      }
    } catch (err) {
      console.error(err);
      await logError(err, "Auth", req.body, null, "POST");
      res.status(400).json({
        success: false,
        msg: "Unable to sign up",
      });
    }
  },
  phone_sign_in: async function (req, res) {
    let { phone } = req.body;
    const now = new Date();
    let code = Math.floor(100000 + Math.random() * 900000);
    const numberFormat =
      String(phone).charAt(0) +
      String(phone).charAt(1) +
      String(phone).charAt(2);
    if (numberFormat !== "+63") {
      phone = "+63" + phone.substring(1);
    }

    const user = await User.find({ phone: phone }).lean().exec();
    if (user.length === 0) {
      let _params = {
        phone: phone,
        verificationCode: code,
        createdAt: now.toISOString(),
        hashed_password: undefined,
        salt: undefined,
        isNew: true,
      };

      let new_user = new User(_params);
      try {
        let result = await User.create(new_user);
        if (!result) {
          res.status(400).json({
            success: false,
            msg: "Unable to sign up",
          });
        }
        await send_sms(phone, `Sparkle Time in verification code ${code}`);
        const token = jwt.sign({ _id: result._id }, process.env.JWT_SECRET);
        let response = {
          ...result._doc,
          isNew: true,
          token,
        };

        res.json(response);
      } catch (err) {
        await logError(err, "Auth", null, user._id, "POST");
        res.status(400).json({
          success: false,
          msg: "Unable to sign up",
        });
      }
    } else {
      // if (user[0].verificationCode !== null) {
      //   await send_sms(phone, `Sparkle Time in verification code ${code}`);
      // }
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
      res.cookie("t", token, { expire: new Date() + 9999 });
      res.json({ ...user[0], token });
    }
  },
  phone_verify: async function (req, res) {
    const { code } = req.body;
    const { id } = req.params;
    const user = await User.find({
      _id: mongoose.Types.ObjectId(id),
      verificationCode: code,
    })
      .lean()
      .exec();

    if (user.length === 0)
      return res.status(400).json({
        success: false,
        msg: `Verification code doesn't match ${id}`,
      });

    try {
      const result = await User.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(id) },
        { isVerified: true, verificationCode: null }
      );
      if (!result)
        res.status(400).json({
          success: false,
          msg: `Unable to verify account ${id}`,
        });
      res.json(result);
    } catch (err) {
      await logError(err, "Auth", null, id, "PATCH");
      res
        .status(400)
        .json({ success: false, msg: `Unable to verify account ${id}` });
    }
  },
  google_sign_in_callback: function (req, res) {
    const _data = {
      _id: req.user._id.toString(),
      token: req.user.token,
      displayName: req.user.displayName,
      image: req.user.image,
      isVerified: JSON.parse(req.user.isVerified),
      company: req.user.company,
      phone: req.user.phone,
      isOnBoarded: JSON.parse(req.user.isOnBoarded),
      role: JSON.parse(req.user.role),
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      createdAt: req.user.createdAt,
    };

    const _url = querystring.stringify(_data);
    let redirect_url =
      parseInt(req.user.role) === 99
        ? `${process.env.REACT_ADMIN_UI}/login?${_url}`
        : `${process.env.REACT_UI}/store/login?${_url}`;
    res.redirect(redirect_url);
  },
};

module.exports = controllers;
