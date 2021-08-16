'use strict';
const jwt = require('jsonwebtoken'); // to generate signed token
const expressJwt = require('express-jwt'); // for authorization check
const User = require('../models/Users');
const mongoose = require('mongoose');
const send_sms = require('../services/twilio');
const querystring = require('querystring');

var controllers = {
    require_sign_in: function (req, res, next) {
        expressJwt({
            secret: process.env.JWT_SECRET,
            userProperty: "auth",
            algorithms: ['sha1', 'RS256', 'HS256'],
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
        if (!email || !password) {
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
            return res.json({ token, ...user[0] });
        } else {
            return res.json({ token, ...user[0], isAdmin: true });
        }
    },
    sign_out: function (req, res) {
        res.clearCookie("t");
        res.json({ message: "Sign out success" });
    },
    phone_sign_in: async function (req, res) {
        let { phone } = req.body;
        const now = new Date();
        let code = Math.floor(100000 + Math.random() * 900000);
        const numberFormat = String(phone).charAt(0) + String(phone).charAt(1) + String(phone).charAt(2);
        if (numberFormat !== '+63') {
            phone = '+63' + phone.substring(1);
        }

        const user = await User.find({ "phone": phone }).lean().exec();
        if (user.length === 0) {

            let _params = {
                phone: phone,
                verificationCode: code,
                createdAt: now.toISOString(),
                hashed_password: undefined,
                salt: undefined,
                isNew: true,
            };

            let new_user = new User(_params);
            try {
                let result = await User.create(new_user);
                if (!result) {
                    res.status(400).json(
                        {
                            success: false,
                            msg: 'Unable to sign up'
                        }
                    );
                }

                send_sms(phone, `Sparkle Time in verification code ${code}`);
                const token = jwt.sign({ _id: result._id }, process.env.JWT_SECRET);
                let response = {
                    ...result._doc,
                    isNew: true,
                    token
                };

                res.json(response);
            } catch (error) {
                res.status(400).json(
                    {
                        success: false,
                        msg: 'Unable to sign up'
                    }
                );
            }
        } else {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
            res.cookie("t", token, { expire: new Date() + 9999 });
            res.json({ ...user[0], token });
        }
    },
    phone_verify: async function (req, res) {
        const { code } = req.body;
        const { id } = req.params;
        const user = await User.find({ id: mongoose.Types.ObjectId(id), verificationCode: code }).lean().exec();
        if (!user) res.status(400).json(
            {
                success: false,
                msg: `Verification code doesn't match ${id}`
            }
        );
        const result = await User.findOneAndUpdate({ _id: mongoose.Types.ObjectId(id) }, { isVerified: true, verificationCode: null });
        if (!result) res.status(400).json(
            {
                success: false,
                msg: `Unable to verify account ${id}`
            }
        );
        res.json(result);
    },
    google_sign_in_callback: function (req, res) {
        const _data = {
            _id: req.user._id.toString(),
            token: req.user.token,
            displayName: req.user.displayName,
            image: req.user.image,
            isVerified: req.user.isVerified,
            isOnBoarded: req.user.isOnBoarded,
            role: parseInt(req.user.role),
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            createdAt: req.user.createdAt
        };

        const _url = querystring.stringify(_data);
        let redirect_url = parseInt(req.user.role) === 99 ? `${process.env.REACT_ADMIN_UI}/login?${_url}` : `${process.env.REACT_UI}/store/login?${_url}`;
        res.redirect(redirect_url);
    }
};

module.exports = controllers;