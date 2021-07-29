'use strict';
const createError = require('http-errors');
const jwt = require('jsonwebtoken'); // to generate signed token
const expressJwt = require('express-jwt'); // for authorization check
const crypto = require('crypto') // to create token

const User = require('../models/user');

var controllers = {
    require_sign_in: function (req, res, next) {
        expressJwt({
            secret: process.env.JWT_SECRET,
            userProperty: "auth"
        });
        next();
    },
    is_authenticated: function (req, res, next) {
        let user = req.profile && req.auth && req.profile._id == req.auth._id;
        if (!user) {
            return res.status(403).json({
                error: "Access denied"
            });
        }
        next();
    },
    sign_in: async function (req, res) {
        const { email, password } = req.body;
        if (!email || password) {
            res.status(400).json({ success: false, msg: `Missing email or password field!` });
            return;
        }

        const user = await User.find({ email: email }).lean().exec();
        if (!user) {
            res.status(201).json({ success: false, msg: `Invalid credentials!` });
            return;
        }
        user.hashed_password = user.salt = undefined;

        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
        res.cookie("t", token, { expire: new Date() + 9999 });

        if (user.role === 0) {
            return res.json({ token, user: user });
        } else {
            return res.json({ token, user: user, isAdmin: true });
        }
    },
    sign_out: function (req, res) {
        res.clearCookie("t");
        res.json({ message: "Sign out success" });
    }
};

module.exports = controllers;