'use strict';
const createError = require("http-errors");
const mongoose = require('mongoose')
const Users = require("../models/Users");
const Billing = require("../models/Billing");
const Subscription = require("../models/Subscription");
const logError = require("../services/logger");


var controllers = {
    get_billing_details: async function (req, res) {
        const { id } = req.params;
        try {
            const result = await Billing.find({ uid: mongoose.Types.ObjectId(id) })
                .lean()
                .exec();

            if (!result)
                return res.status(200).json({ success: false, msg: `No such Billing.` });

            if (result[0].subscription === '0' || result[0].subscription === 0) return res.status(200).json(result[0]);
            const subscription = await Subscription.find({ _id: mongoose.Types.ObjectId(result[0].subscription) }).lean().exec()
            result[0].subscription = { ...subscription[0] }
            res.status(200).json(result[0]);
        } catch (err) {
            await logError(err, "Billing.get_billing_details", null, id, "GET");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    post_billing_details: async function (req, res) {
        const { address, address2, state, city, country, uid, zipCode } = req.body;

        if (!address || !city || !country || !zipCode || !uid) return res.status(400).json({ success: false, msg: 'Missing required fields' });

        let _params = {
            uid: mongoose.Types.ObjectId(uid),
            address,
            address2,
            zipCode,
            country,
            state,
            city,
        };

        let new_billing_details = new Billing(_params);
        try {
            let result = await Billing.create(new_billing_details);
            if (!result)
                res.status(201).json({ success: false, msg: `No such Billing.` });
            res.json(result);
        } catch (err) {
            await logError(err, "Billing.post_billing_details", null, JSON.stringify(req.body), "POST");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    patch_billing_details_only: async function (req, res) {
        const { address, address2, state, city, country, uid, zipCode } = req.body;

        if (!address || !city || !country || !zipCode || !uid) return res.status(400).json({ success: false, msg: 'Missing required fields' });

        const isBillingExist = await Billing.find({ uid: mongoose.Types.ObjectId(uid) }).lean().exec()
        if (!isBillingExist || isBillingExist.length <= 0) return res.status(400).json({ success: false, msg: 'No Billing exists' });

        let _params = {
            address,
            address2,
            zipCode,
            country,
            state,
            city,
        };

        try {
            let result = await Billing.findOneAndUpdate(
                { uid: mongoose.Types.ObjectId(uid) },
                _params
            );

            if (!result)
                res.status(201).json({ success: false, msg: `No such Billing.` });
            res.json(result);
        } catch (err) {
            await logError(err, "Billing.post_billing_details", null, JSON.stringify(req.body), "POST");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    },
    patch_billing_details: async function (req, res) {
        const { uid, subscription } = req.body;

        if (!uid || !subscription) return res.status(400).json({ success: false, msg: 'Missing required fields' });

        const isSubscriptionExist = await Subscription.find({ _id: mongoose.Types.ObjectId(subscription) }).lean().exec()
        if (!isSubscriptionExist || isSubscriptionExist.length <= 0) return res.status(400).json({ success: false, msg: 'No Subscription exists' })


        const isBillingExist = await Billing.find({ uid: mongoose.Types.ObjectId(uid) }).lean().exec()
        if (!isBillingExist || isBillingExist.length <= 0) return res.status(400).json({ success: false, msg: 'No Billing exists' });

        if (isBillingExist[0].subscription === '0' || isBillingExist[0].subscription === 0) {
            const UserDetails = await Users.find({ _id: mongoose.Types.ObjectId(uid), role: 1 }).lean().exec()
            if (UserDetails[0].role === 0) return res.status(400).json({ success: false, msg: 'Unauthorized request' });
            await Users.findOneAndUpdate(
                { _id: mongoose.Types.ObjectId(uid) },
                { role: 4 }
            );
        }

        try {
            let result = await Billing.findOneAndUpdate(
                { uid: mongoose.Types.ObjectId(uid) },
                { subscription }
            );

            if (!result)
                res.status(200).json({ success: false, msg: `No such Billing.` });
            res.status(200).json(result);
        } catch (err) {
            await logError(err, "Billing.patch_billing_details", null, JSON.stringify(req.body), "PATCH");
            res.status(400).json({ success: false, msg: err });
            throw new createError.InternalServerError(err);
        }
    }
};

module.exports = controllers;