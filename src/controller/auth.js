"use strict";
const jwt = require("jsonwebtoken"); // to generate signed token
const jwt_decode = require('jwt-decode')
const User = require("../models/Users");
const mongoose = require("mongoose");
const send_sms = require("../services/twilio");
const querystring = require("querystring");
const logError = require("../services/logger");
const logDevice = require("../services/devices");
const moment = require('moment-timezone');
const now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const maxAge = 3 * 24 * 60 * 60;
const create_token = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: maxAge });
};
let store_end_access = [99, 1, 4];

var controllers = {
  require_sign_in: function (req, res, next) {
    let token = req.headers["authorization"];
    if (!token || typeof token === undefined)
      return res
        .status(401)
        .json({ success: false, is_authorized: false, msg: "Not authorized" });

    token = token.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded_token) => {
      if (err)
        return res.status(401).json({
          success: false,
          is_authorized: false,
          msg: "Not authorized",
        });

      next();
    });
  },
  is_authenticated: function (req, res, next) {
    let token = req.headers["authorization"];

    if (!token || typeof token === undefined)
      return res
        .status(401)
        .json({ success: false, is_authorized: false, msg: "Not authorized" });

    token = token.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded_token) => {
      if (err) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      let user = await User.find({
        _id: mongoose.Types.ObjectId(decoded_token.id),
      })
        .lean()
        .exec();

      if (!user) {
        return res.status(401).json({
          error: "Unable to access",
        });
      }

      next();
    });
  },
  is_store_authenticated: async function (req, res, next) {
    let token = req.headers["authorization"];
    const id = jwt_decode(token).id
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });
    let user = await User.find({
      _id: mongoose.Types.ObjectId(id),
    })
      .lean()
      .exec();
    if (!user || user.length === 0) {
      return res.status(401).json({
        error: "Unable to access",
      });
    }

    let role = store_end_access.includes(user[0].role);
    if (!role) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }
    next();
  },
  is_admin_authenticated: async function (req, res, next) {
    let token = req.headers["authorization"];
    const id = jwt_decode(token).id
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });
    let user = await User.find({
      _id: mongoose.Types.ObjectId(id),
    })
      .lean()
      .exec();
    if (!user || user.length === 0) {
      return res.status(401).json({
        error: "Unable to access",
      });
    }

    let role = (user[0].role === 99)
    if (!role) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }
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
      const user = await User.login(email, password);
      if (!user) {
        res.status(400).json({ success: false, msg: `Invalid credentials!` });
        return;
      }

      user.hashed_password = user.salt = undefined;
      await User.findOneAndUpdate({ email: email, isArchived: false }, { updatedAt: now }, {upsert: true}).lean().exec();
      const token = create_token(user._id);
      res.cookie("jwt", token, { expire: new Date() + 9999 });
      if (user.role === 0) {
        const store = await User.find({ company: user.company }).lean().exec();
        return res.json({ token, ...user, store_id: store[0]._id });
      } else {
        return res.json({ token, ...user, isAdmin: true });
      }
    } catch (err) {
      await logError(err, "Auth.sign_in", null, null, "POST");
      res.status(400).json({ success: false, msg: err });
    }
  },
  sign_out: function (req, res) {
    res.clearCookie("jwt");
    res.json({ message: "Sign out success" });
  },
  store_sign_up: async function (req, res) {
    let { email, firstName, lastName, phone, company, password, role } = req.body;
    let _params
    if (!email || !firstName || !lastName || !phone || !company || !password)
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

    const user = await User.find({ email: email, isArchived: false}).lean().exec();
    if (user.length !== 0)
      return res.status(400).json({
        success: false,
        msg: "Email already exists",
      });

    try {
      if(role) {
        _params = {
          firstName: firstName,
          lastName: lastName,
          displayName: `${firstName} ${lastName}`,
          email: email,
          company: company,
          phone: phone,
          verificationCode: code,
          createdAt: now.toISOString(),
          password: password,
          role: role,
          isOnBoarded: true,
          isVerified: true,
          isArchived: true
        };  
      }
      else {
        _params = {
          firstName: firstName,
          lastName: lastName,
          displayName: `${firstName} ${lastName}`,
          email: email,
          company: company,
          phone: phone,
          verificationCode: code,
          createdAt: now.toISOString(),
          password: password,
          role: 1, // store registration
          isOnBoarded: true,
          isVerified: true,
          isArchived: true
        }; 
      }
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
        const token = jwt.sign({ id: result._id }, process.env.JWT_SECRET);
        let response = {
          ...result._doc,
          isVerified: true,
          isOnBoarded: true,
          token,
        };

        res.json(response);
      } catch (err) {
        await logError(err, "Auth.store_sign_up", req.body, null, "POST");
        res.status(400).json({
          success: false,
          msg: "Unable to sign up",
        });
      }
    } catch (err) {
      console.error(err);
      await logError(err, "Auth.store_sign_up", req.body, null, "POST");
      res.status(400).json({
        success: false,
        msg: "Unable to sign up",
      });
    }
  },
  sign_up: async function (req, res) {
    let { email, firstName, lastName, phone, company, password } = req.body;

    if (!email || !firstName || !lastName || !phone || !company || !password)
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

    const store = await User.find({ _id: mongoose.Types.ObjectId(company) })
      .lean()
      .exec();

    const user = await User.find({ email: email, isArchived: false }).lean().exec();
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
        company: store[0].company,
        phone: phone,
        verificationCode: code,
        createdAt: now.toISOString(),
        password: password,
        role: 0,
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
        const token = jwt.sign({ id: result._id }, process.env.JWT_SECRET);
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
    let code = Math.floor(100000 + Math.random() * 900000);
    const numberFormat =
      String(phone).charAt(0) +
      String(phone).charAt(1) +
      String(phone).charAt(2);
    if (numberFormat !== "+63") {
      phone = "+63" + phone.substring(1);
    }

    const user = await User.find({ phone: phone, isArchived: false }).lean().exec();

    if (user.length <= 0)
      return res
        .status(400)
        .json({ success: false, msg: `Invalid phone number` });

    if (!user[0].isVerified || user[0].isVerified === "false") {
      await send_sms(phone, `Sparkle Time in verification code ${code}`);
    }

    try {
      await User.findOneAndUpdate({ phone: phone, isArchived: false }, { lastLogin: now }, {upsert: true}).lean().exec();
      const store = await User.find({
        company: user[0].company,
      })
        .lean()
        .exec();
      const token = create_token(user[0]._id);
      res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });

      await logDevice(req.useragent, "Auth.phone_sign_in", user[0]._id, "POST");

      res.status(201).json({ ...user[0], token, store_id: store[0]._id });
    } catch (err) {
      await logError(err, "Auth.phone_sign_in", err, null, "POST");
      res
        .status(400)
        .json({ success: false, msg: `Unable to sign in using phone` });
    }
  },
  phone_sign_up: async function (req, res) {
    let { phone, company } = req.body;
    const now = new Date();
    let code = Math.floor(100000 + Math.random() * 900000);
    const numberFormat =
      String(phone).charAt(0) +
      String(phone).charAt(1) +
      String(phone).charAt(2);
    if (numberFormat !== "+63") {
      phone = "+63" + phone.substring(1);
    }

    const user = await User.find({ phone: phone, isArchived: false }).lean().exec();
    if (user.length === 0) {
      const store = await User.find({ _id: mongoose.Types.ObjectId(company) })
        .lean()
        .exec();

      if (!store) {
        return res.status(400).json({
          success: false,
          msg: "Unable to sign in store not found",
        });
      }

      let _params = {
        phone: phone,
        verificationCode: code,
        company: store[0].company,
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
        const token = create_token(result._id);

        let response = {
          ...result._doc,
          isNew: true,
          token,
          store_id: company,
          sid: company,
        };

        res.json(response);
      } catch (err) {
        await logError(err, "Auth.phone_sign_in", null, user._id, "POST");
        res.status(400).json({
          success: false,
          msg: "Unable to sign up",
        });
      }
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
      await logError(err, "Auth.phone_verify", null, id, "PATCH");
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

    res.cookie("jwt", req.user.token, { expire: new Date() + 9999 });
    let redirect_url =
      parseInt(req.user.role) === 99
        ? `${process.env.REACT_ADMIN_UI}/login?${_url}`
        : `${process.env.REACT_UI}/store?${_url}`;
    res.redirect(redirect_url);
  },
  sign_in_v2: async function (req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, msg: `Missing email or password field!` });
      return;
    }

    try {
      const user = await User.login(email, password);
      if (!user) {
        res.status(400).json({ success: false, msg: `Invalid credentials!` });
        return;
      }


      if (user.role !== 99) return res.status(400).json({ success: false, msg: `Invalid credentials!` });

      user.hashed_password = user.salt = undefined;

      const token = create_token(user._id);
      res.cookie("jwt", token, { expire: new Date() + 9999 });
      if (user.role === 0) {
        const store = await User.find({ company: user.company }).lean().exec();
        return res.json({ token, ...user, store_id: store[0]._id });
      } else {
        return res.json({ token, ...user, isAdmin: true });
      }
    } catch (err) {
      await logError(err, "Auth.sign_in", null, null, "POST");
      res.status(400).json({ success: false, msg: err });
    }
  },
  sign_up_branch: async function (req, res) {
    let { name, uid } = req.body;

    if (!name || !uid)
      return res.status(400).json({
        success: false,
        msg: "Please provide required fields",
      });

    const user = await User.find({ company: name }).lean().exec();
    if (user.length !== 0)
      return res.status(400).json({
        success: false,
        msg: "Branch already exists",
      });

    try {
      let _params = {
        displayName: name,
        company: name,
        role: 5, // branch registration
        parentCompany: uid
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

        res.json({ ...result._doc });
      } catch (err) {
        await logError(err, "Auth.sign_up_branch", req.body, null, "POST");
        res.status(400).json({
          success: false,
          msg: "Unable to sign up",
        });
      }
    } catch (err) {
      console.error(err);
      await logError(err, "Auth.sign_up_branch", req.body, null, "POST");
      res.status(400).json({
        success: false,
        msg: "Unable to sign up",
      });
    }
  }
};

module.exports = controllers;
