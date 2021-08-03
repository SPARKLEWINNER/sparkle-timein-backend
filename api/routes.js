'use strict'
const passport = require('passport')
const querystring = require('querystring');
var api = require('./controller/default');
var user = require('./controller/users');
var auth = require('./controller/auth');

module.exports = function (app) {
    app.route('/').get(api.get_app_info);
    app.route('/api/users').get(auth.require_sign_in, user.get_users);
    app.route('/api/user/:id').get(auth.require_sign_in, user.get_user);

    app.route('/api/login').post(auth.sign_in);
    app.route('/api/phone').post(auth.phone_sign_in);
    app.route('/api/phone/verify/:id').post(auth.require_sign_in, auth.phone_verify);
    app.route('/api/google').get(passport.authenticate('google', { scope: ['profile', 'email'] }));
    app.route('/api/google/callback').get(passport.authenticate('google', { failureRedirect: '/api/google' }), (req, res) => {
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
        res.redirect(`${process.env.REACT_UI}/store/login?${_url}`);
        // res.status(200).send({ ...req.user })
    });
    app.route('/api/signout').get(auth.require_sign_in, auth.sign_out);



    app.route('/api/user/:id').patch(auth.require_sign_in, user.update_user);

}
