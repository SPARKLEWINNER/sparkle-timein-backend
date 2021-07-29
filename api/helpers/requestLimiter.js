'use strict'
const RateLimit = require('express-rate-limit');
const minutes = 5;

// Attempt to limit spam post requests for inserting data
exports.postLimiter = () => {
    new RateLimit({

        windowMs: minutes * 60 * 1000, // milliseconds
        max: 100, // Limit each IP to 100 requests per windowMs 
        delayMs: 0, // Disable delaying - full speed until the max limit is reached 
        handler: (req, res) => {
            res.status(429).json({ success: false, msg: `You made too many requests. Please try again after ${minutes} minutes.` });
        }
    });
};
