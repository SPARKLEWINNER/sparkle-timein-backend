'use strict';
const createError = require("http-errors");
const mongoose = require('mongoose')
const Subscription = require("../models/Subscription");
const logError = require("../services/logger");
const User = require("../models/Users");
const Group = require("../models/Group");


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
        const { store, feature, id, length } = req.body;
        const today = new Date();
        let expiry;
        let price = 0;
        if (!store || !feature /*|| !length*/) return res.status(400).json({ success: false, msg: 'Missing required fields' });
        try {
            const isSubscriptionExist = await Subscription.find({ store: store, feature: feature/*, expiry: { $gte: today }*/ })
            .lean()
            .exec(); 
            if (isSubscriptionExist.length > 0) {
                /*res.status(400).json({ success: false, msg: "Subscription still exist" });*/
                res.status(400).json({ success: false, msg: "Subscription already enrolled" });
            } 
            else {
/*                if (length === "Monthly") {
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
                };*/
                let _params = {
                    store,
                    feature,
                    id,
/*                    price,
                    length,
                    expiry,
                    today,
                    today*/
                };

                let new_subscription = new Subscription(_params);
                let result = await Subscription.create(new_subscription);
                if (!result)
                    res.status(201).json({ success: false, msg: `No such subscription.` });
                res.status(200).json({ success: true, msg: `Subription save` });
                // try {
                //     let result = await Subscription.create(new_subscription);
                //     if (!result)
                //         res.status(201).json({ success: false, msg: `No such subscription.` });
                //     res.status(200).json({ success: true, msg: `Subription save` });
                // } catch (err) {
                //     /*await logError(err, "Subscription.post_settings", null, JSON.stringify(req.body), "POST");*/
                //     res.status(400).json({ success: false, msg: err });
                //     throw new createError.InternalServerError(err);
                // }
            }     
        } 
        catch (err) {
            /*await logError(err, "Subscription.post_subscription", null, id, "POST");*/
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

    },

    delete_group_feature: async function(req, res) {
      try {

        const { id } = req.params;
        if (!id) {
          return res.status(422).json({ message: "Group feature ID is required" });
        }

        const deletedGroup = await Subscription.findByIdAndDelete(id).lean().exec();

        if (!deletedGroup) {
          return res.status(404).json({ success: false, message: "Group feature not found" });
        }

        return res.status(200).json({
          success: true,
          message: "Group feature deleted successfully",
          deletedGroup: deletedGroup
        });

      } catch (err) {
        console.error("Error deleting group feature:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
      }
    },

    check_group_feature: async function(req, res) {
        try {
            const { store } = req.body;

            let group = await Group.find({ store: { $in: [store] } }).lean().exec();
            if(!group) {
                return res.status(404).json({ success: false, message: "Group not found" });    
            }
            else {
                const results = await Promise.all(
                  group.map(async (data) => {
                    try {
                      let storeName = await User.findOne({ _id: new mongoose.Types.ObjectId(data.groupid) }).lean().exec();
                      
                      if (!storeName) {
                        return { success: false, message: "Store not found" };
                      }

                      let features = await Subscription.find({ store: storeName.company })
                        .select("feature -_id")
                        .lean()
                        .exec();

                      return { success: true, features };
                    } catch (error) {
                      return { success: false, message: error.message };
                    }
                  })
                );

                // Return the response
                return res.status(200).json(results);
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({
              success: false,
              message: "Internal Server Error",
            });
        }
    }
};

module.exports = controllers;