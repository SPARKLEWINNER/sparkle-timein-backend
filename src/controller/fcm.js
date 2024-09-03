const mongoose = require('mongoose')
const Users = require('../models/Users')
const FCMTOKEN = require('../models/Fcmtokens')
const logError = require("../services/logger");

var controllers = {
    register_fcm_token: async function (req, res) {
        const {id} = req.params
        try {
          console.log(req.body)
    
          const {fcmToken, device} = req.body
    
          if (!fcmToken || !device) {
            return res.status(400).json({success: false, msg: 'Invalid request'})
          }
    
          const checkFCMTokens = await FCMTOKEN.find({ fcmToken: fcmToken });
    
          let dupCount = 0;
          let diffCount = 0;
          let token;
    
          if (checkFCMTokens.length > 0) {
            await Promise.all(checkFCMTokens.map(async (fcm) => {
              if (fcm.userId.toString() !== id.toString()) {
                diffCount++;
                await FCMTOKEN.deleteOne({ fcmToken: fcm.fcmToken, userId: fcm.userId });
              } else {
                dupCount++;
                if (dupCount > 1) {
                  await FCMTOKEN.deleteOne({ fcmToken: fcm.fcmToken, userId: id });
                }
              }
            }));
            if (dupCount === 0 && diffCount >= 1) {
              token = new FCMTOKEN({
                userId: id,
                fcmToken: fcmToken,
                device: device
              });
              await token.save();
    
              await Users.findOneAndUpdate({ _id: mongoose.Types.ObjectId(id) }, { isNotifOn: true });
              return res.status(200).json({ success: true, msg: 'Successfully registered FCM token', data: token });
            }
    
            await Users.findOneAndUpdate({ _id: mongoose.Types.ObjectId(id) }, { isNotifOn: true });
            return res.status(200).json({ success: true, msg: 'Token already exists, proceeding to login', data: token });
          } else {
            token = new FCMTOKEN({
              userId: id,
              fcmToken: fcmToken,
              device: device
            });
            await token.save();
            await Users.findOneAndUpdate({ _id: mongoose.Types.ObjectId(id) }, { isNotifOn: true });
    
            return res.status(200).json({ success: true, msg: 'Successfully registered FCM token', data: token });
          }
        } catch (error) {
          console.error(error)
          await logger.logError(error, 'fcm-registration.service.register_fcm_token', null, id, 'POST')
    
          return res.status(502).json({success: false, msg: 'Unable to get details'})
        }
      },
    
      unregister_fcm_token: async function (req, res) {
        const {id} = req.params
        try {
          let {fcmToken} = req.body
          if (fcmToken == undefined) {
            fcmToken = req.query.fcmToken
          }
    
          if (!fcmToken) {
            return res.status(400).json({success: false, msg: 'Invalid request'})
          }
    
          await FCMTOKEN.deleteMany({
            fcmToken: fcmToken
          })
    
          return res.status(200).json({success: true, msg: 'Successfully unregistered fcm token'})
        } catch (error) {
          console.error(error)
          await logger.logError(error, 'fcm-registration.service.unregister_fcm_token', null, id, 'DELETE')
    
          return res.status(502).json({success: false, msg: 'Unable to get details'})
        }
      },
      get_active_fcm_token: async function (req, res) {
        try {
          const userId = req.params.id
          console.log('🚀 ~ file: fcm-registration.service.js:57 ~ userId:', userId)
          // const thresholdTime = 24 * 60 * 60 * 1000
    
          const token = await FCMTOKEN.find({userId: mongoose.Types.ObjectId(userId)})
            // .sort({createdAt: -1})
            .exec()
          console.log('🚀 ~ file: fcm-registration.service.js:61 ~ token:', token)
    
          if (token) {
            return res.json({success: true, fcmTokens: token})
    
            // const currentTime = new Date()
            // const tokenUpdateTime = new Date(token.updatedAt)
    
            // if (currentTime - tokenUpdateTime < thresholdTime) {
            //   console.log('active token return')
    
            // } else {
            //   return res.json({success: false, message: 'Inactive FCM token.'})
            // }
          } else {
            return res.json({success: false, message: 'No FCM token found for the user.'})
          }
        } catch (error) {
          console.error('Error fetching FCM token:', error)
          return res.status(500).json({success: false, message: 'Internal server error.'})
        }
      }
}

module.exports = controllers
