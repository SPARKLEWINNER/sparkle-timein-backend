// notificationService.js
const {messaging} = require('./firebase');
const FCMTOKEN = require('../models/Fcmtokens')
const Schedule = require('../models/Schedule')
require('dotenv').config()

const sendNotification = async (token, message) => {
  const payload = {
    notification: {
      title: 'Reminder',
      body: message,
    },
    token: token,
  };

  try {
        const response = await messaging.send(payload);
        return console.log('Successfully sent message:', response);
    } catch (error) {
        return console.error('Error sending message:', error);
    }
};


const checkTimeForUsers = async () => {
  try {
    const now = new Date();
    const fcmDet = await FCMTOKEN.find({device: 'pwa'});
    if (!fcmDet) {
      console.log('No subscribed users found');
      return;
    }

    const messages = fcmDet.map((det) => {
       return Schedule.findOne({uid: `${det.userId}` , date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))})
    });

    console.log('ito oh:', messages)

    
  } catch (err) {
    console.error('Error checking time for user:', err);
  }
};


// const watchMultipleUsersEventTime = () => {
//   setInterval(async () => {
//       await checkTimeForUsers();
//   }, 300000); // Check every minute
// };

const watchMultipleUsersEventTime = () => {
  setInterval(async () => {
      await checkTimeForUsers();
  }, 5000); // Check every minute
};

// Start watching for multiple users
// watchMultipleUsersEventTime();
