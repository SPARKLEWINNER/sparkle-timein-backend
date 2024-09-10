// notificationService.js
const {messaging} = require('./firebase');
const FCMTOKEN = require('../models/Fcmtokens')
const Schedule = require('../models/Schedule')
const cron = require('node-cron');
const moment = require('moment-timezone');
const now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
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
  // cron.schedule('*/5 * * * * *', async () => {
    try {
      const result = await checkTimeForSubscribedUsers();
      if (result) {
        result.forEach((data) => {
          console.log('data: ', data)
          const {fcmToken, schedule} = data
          if (schedule) {
            const {to} = schedule
            const message = `Your time is past ${moment(to, 'HH:mm').format('hh:mm A')}, Please time out soon.`
            const currentTime = now
            currentTime.setSeconds(0)
            currentTime.setMilliseconds(0)
            const scheduleTime = new Date(`${moment(to, 'HH:mm').format('YYYY-MM-DD')}T${to}:00.000Z`);
            scheduleTime.setMinutes(scheduleTime.getMinutes() + 5)
            console.log('timezone: ', moment.tz.guess())
            console.log('To: ', to)
            console.log('scheduleTime: ', scheduleTime)
            console.log('currentTime: ', currentTime)
            console.log('message: ', message)
            console.log('schedule time', scheduleTime.getTime())
            console.log('current time', currentTime.getTime())
            if(scheduleTime.getTime() === currentTime.getTime() && currentTime > new Date(to)){
              console.log('executed to remind')
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
  // cron.schedule('*/5 * * * * *', async () => {
    try {
      const result = await checkTimeForSubscribedUsers();
      if (result) {
        result.forEach((data) => {
          console.log('data: ', data)
          const {fcmToken, schedule} = data
          if (schedule) {
            const {from} = schedule
            const message = `Your time ${moment(from, 'HH:mm', 'Asia/Manila').format('hh:mm A')} is nearing, Please time in soon.`
            const currentTime = now
            currentTime.setSeconds(0)
            currentTime.setMilliseconds(0)
            const scheduleTime = new Date(`${moment(from, 'HH:mm').format('YYYY-MM-DD')}T${from}:00.000Z`);
            scheduleTime.setMinutes(scheduleTime.getMinutes() - 5)
            console.log('scheduleTime: ', scheduleTime)
            console.log('currentTime: ', currentTime)
            console.log('message: ', message)
            console.log('schedule time', scheduleTime.getTime())
            console.log('current time', currentTime.getTime())
            if(scheduleTime.getTime() === currentTime.getTime() && currentTime < scheduleTime){
              console.log('executed to remind')
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


