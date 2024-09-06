"use strict";
const mongoose = require('mongoose');
const logError = require("../services/logger");
const {scheduleReminderForUser, scheduleRemindersForAllUsers} = require('../services/notif')

var controllers = {
    send_reminder_notif: async function (req, res) {
        
    }
};

module.exports = controllers;