'use strict';
const createError = require("http-errors");
const Settings = require("../models/Settings");
const logError = require("../services/logger");


var controllers = {
    get_settings: async function (req, res) {
        try {
            const result = await Settings.find()
                .lean()
                .exec();
            if (!result)
                res.status(200).json({ success: false, msg: `No such settings.` });
            res.json(result);
        } catch (err) {
            await logError(err, "Settings.get_settings", null, null, "GET");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    get_setting_force_relog: async function (req, res) {
        try {
            const result = await Settings.find({ type: "forceRelog" })
                .lean()
                .exec();
            if (!result)
                res.status(200).json({ success: false, msg: `No such settings.` });
            res.json(result);
        } catch (err) {
            await logError(err, "Settings.get_setting_force_relog", null, null, "GET");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    post_settings: async function (req, res) {
        const { type, value } = req.body;

        let _params = {
            type: type,
            value: value,
        };

        let new_setting = new Settings(_params);
        try {
            let result = await Settings.create(new_setting);
            if (!result)
                res.status(200).json({ success: false, msg: `No such setting.` });
            res.json(result);
        } catch (err) {
            await logError(err, "Settings.post_settings", null, JSON.stringify(req.body), "POST");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }

    }
};

module.exports = controllers;