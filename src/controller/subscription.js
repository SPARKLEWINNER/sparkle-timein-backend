

'use strict';
const createError = require("http-errors");
const mongoose = require('mongoose')
const Subscription = require("../models/Subscription");
const logError = require("../services/logger");


var controllers = {
    get_subscriptions: async function (req, res) {
        try {
            const result = await Subscription.find()
                .lean()
                .exec();
            if (!result)
                res.status(200).json({ success: false, msg: `No such subscription.` });
            res.json(result);
        } catch (err) {
            await logError(err, "Subscription.get_settings", null, null, "GET");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    get_subscription: async function (req, res) {
        const { id } = req.params;
        try {
            const result = await Subscription.find({ _id: mongoose.Types.ObjectId(id) })
                .lean()
                .exec();
            if (!result)
                res.status(200).json({ success: false, msg: `No such subscription.` });
            res.json(result[0]);
        } catch (err) {
            await logError(err, "Subscription.get_subscription", null, id, "GET");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    post_subscription: async function (req, res) {
        const { name, userLimit, branchLimit, details, sortBy } = req.body;

        if (!name || userLimit === 0 || branchLimit === 0 || !details || !sortBy) return res.status(400).json({ success: false, msg: 'Missing required fields' });

        let _params = {
            name,
            userLimit,
            branchLimit,
            details,
            sortBy
        };

        let new_subscription = new Subscription(_params);
        try {
            let result = await Subscription.create(new_subscription);
            if (!result)
                res.status(201).json({ success: false, msg: `No such subscription.` });
            res.json(result);
        } catch (err) {
            await logError(err, "Subscription.post_settings", null, JSON.stringify(req.body), "POST");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    patch_subscription_details: async function (req, res) {
        const { id } = req.params
        const { name, userLimit, branchLimit, details, sortBy } = req.body;
        const isSubscriptionExist = await Subscription.find({ _id: mongoose.Types.ObjectId(id) }).lean().exec()

        if (!isSubscriptionExist || isSubscriptionExist.length <= 0) return res.status(400).json({ success: false, msg: 'No Subscription exists' });

        if (!name || userLimit === 0 || branchLimit === 0 || !details || !sortBy) return res.status(400).json({ success: false, msg: 'Missing required fields' });

        let _params = {
            name,
            userLimit,
            branchLimit,
            details,
            sortBy
        };

        try {
            let result = await Subscription.findOneAndUpdate(
                { _id: mongoose.Types.ObjectId(id) },
                _params
            );
            if (!result)
                res.status(200).json({ success: false, msg: `No such subscription.` });
            res.json(result);
        } catch (err) {
            await logError(err, "Subscription.patch_subscription", null, JSON.stringify(req.body), "PATCH");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }

    }
};

module.exports = controllers;