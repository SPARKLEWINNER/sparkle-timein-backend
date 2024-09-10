// notificationService.js
const {messaging} = require('./firebase');
const FCMTOKEN = require('../models/Fcmtokens')
const Schedule = require('../models/Schedule')
const cron = require('node-cron');
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


const checkTimeForSubscribedUsers = async () => {
  try {
    const now = new Date();
    const fcmDet = await FCMTOKEN.find({device: 'pwa'});
    if (!fcmDet) {
      console.log('No subscribed users found');
      return;
    }

    const messages = fcmDet.map((det) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const formattedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
      return Schedule.findOne({uid: `${det.userId}` , date: formattedDate}).then(schedule => ({
        fcmToken: det.fcmToken,
        schedule
      }))
    });

    const result = await Promise.all(messages)
    return result.filter(r => r.schedule !== null)
    
  } catch (err) {
    console.error('Error checking time for user:', err);
  }
};


const watchMultipleUsersEventTime = () => {
  setInterval( () => {
       checkFiveMinutesAfter();
  }, 5000); // Check every minute
};

// Start watching for multiple users
// watchMultipleUsersEventTime();

const checkFiveMinutesAfter = () => {
  console.log('Checking 5 minutes after every hour');
  cron.schedule('05 * * * *', async () => {
    try {
      const result = await checkTimeForSubscribedUsers();
      if (result) {
        result.forEach((data) => {
          console.log('data: ', data)
          const {fcmToken, schedule} = data
          if (schedule) {
            const {to} = schedule
            const message = `Your time is past ${to}, Please time out soon.`
            const currentTime = new Date()
            const scheduleTime = new Date(to)
            scheduleTime.setMinutes(scheduleTime.getMinutes() + 5)
            if(scheduleTime === currentTime && new Date() > new Date(to)){
              sendNotification(fcmToken, message);
            }
          }
        })
      }
    } catch (e) {
      console.error('Error checking time for user:', e);
    }
  });
}

checkFiveMinutesAfter();
const checkFiveMinutesBefore = () => {
  console.log('Checking 5 minutes before every hour');
  cron.schedule('55 * * * *', async () => {
    try {
      const result = await checkTimeForSubscribedUsers();
      if (result) {
        result.forEach((data) => {
          console.log('data: ', data)
          const {fcmToken, schedule} = data
          if (schedule) {
            const {from} = schedule
            const message = `Your time ${from} is nearing, Please time in soon.`
            const currentTime = new Date()
            const scheduleTime = new Date(from)
            scheduleTime.setMinutes(scheduleTime.getMinutes() - 5)
            if(scheduleTime === currentTime && new Date() < new Date(from)){
              sendNotification(fcmToken, message);
            }
          }
        })
      }
    } catch (e) {
      console.error('Error checking time for user:', e);
    }
  });
}


checkFiveMinutesBefore();
