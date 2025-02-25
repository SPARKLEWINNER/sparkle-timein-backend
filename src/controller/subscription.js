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
        const { store } = req.body;
        const today = new Date();
        try {
            const isSubscriptionExist = await Subscription.find({ store: store, expiry: { $gte: today } })
                .lean()
                .exec();

            if (!isSubscriptionExist)
                res.status(200).json({ success: false, msg: `No such subscription.` });

            res.json(isSubscriptionExist);
        } catch (err) {
            await logError(err, "Subscription.get_subscription", null, null, "GET");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    post_subscription: async function (req, res) {
        const { store, feature, length } = req.body;
        const today = new Date();
        let expiry;
        let price = 0;
        if (!store || !feature || !length) return res.status(400).json({ success: false, msg: 'Missing required fields' });
        try {
            const isSubscriptionExist = await Subscription.find({ store: store, feature: feature, expiry: { $gte: today } })
            .lean()
            .exec(); 
            if (isSubscriptionExist.length > 0) {
                res.status(400).json({ success: false, msg: "Subscription still exist" });
            } 
            else {
                if (length === "Monthly") {
                    price = 200;
                    expiry = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate(), today.getHours(), today.getMinutes(), today.getSeconds())
                } 
                else {
                    price = 2000
                    expiry = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate(), today.getHours(), today.getMinutes(), today.getSeconds())
                }
                let _params = {
                    store,
                    feature,
                    price,
                    length,
                    expiry,
                    today,
                    today
                };

                let new_subscription = new Subscription(_params);
                try {
                    let result = await Subscription.create(new_subscription);
                    if (!result)
                        res.status(201).json({ success: false, msg: `No such subscription.` });
                    res.status(200).json({ success: true, msg: `Subription save` });
                } catch (err) {
                    await logError(err, "Subscription.post_settings", null, JSON.stringify(req.body), "POST");
                    res.status(400).json({ success: false, msg: err });
                    throw new createError.InternalServerError(err);
                }
            }     
        } 
        catch (err) {
            await logError(err, "Subscription.post_subscription", null, id, "POST");
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