const createError = require("http-errors");
const stringCapitalizeName = require("string-capitalize-name");
const mongoose = require("mongoose");
const User = require("../models/Users");
const logError = require("../services/logger");

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
      const result = await User.find({ company: store.company }).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(201).json(result);
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
};

module.exports = controllers;
