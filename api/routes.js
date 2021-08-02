'use strict'
const passport = require('passport')
var api = require('./controller/default');
var user = require('./controller/users');
var auth = require('./controller/auth');

module.exports = function (app) {
    app.route('/').get(api.get_app_info);
    app.route('/api/users').get(auth.require_sign_in, auth.is_authenticated, user.get_users);
    app.route('/api/user/:id').get(auth.require_sign_in, auth.is_authenticated, user.get_user);

    app.route('/api/phone').post(auth.phone_sign_in);
    app.route('/api/google').get(passport.authenticate('google', { scope: ['profile', 'email'] }));
    app.route('/api/google/callback').get(passport.authenticate('google', { failureRedirect: '/api/google' }), (req, res) => {
        res.status(200).send({ ...req.user })
    });

    app.route('/api/user/:id').patch(auth.require_sign_in, auth.is_authenticated, user.update_user);

}
