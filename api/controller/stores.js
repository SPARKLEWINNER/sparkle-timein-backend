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
      const result = await User.find({ company: store.company, isArchived: false }).lean().exec();
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

          return res.json(result);
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
    console.log(user_id)
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
};

module.exports = controllers;
