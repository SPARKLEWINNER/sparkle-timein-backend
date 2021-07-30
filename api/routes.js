'use strict'
var api = require('./controller/default');
var user = require('./controller/users');
var auth = require('./controller/auth');

module.exports = function (app) {
    app.route('/').get(api.get_app_info);
    app.route('/api/login').get(user.get_users);
    app.route('/api/authorize/google/login').post(auth.google_sign);
    app.route('/api/authorize/google/phone').post(auth.phone_sign_in);

    app.route('/api/users').get(user.get_users);
    app.route('/api/users/:id').get(auth.require_sign_in, auth.is_authenticated, user.get_user);

}
