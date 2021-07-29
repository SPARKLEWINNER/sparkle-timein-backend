'use strict'
var api = require('./controller/default');
var user = require('./controller/users');
var auth = require('./controller/auth');
module.exports = function (app) {
    app.route('/').get(api.get_app_info);
    app.route('/users').get(user.get_user);
    app.route('/users/:id').get(auth.require_sign_in, auth.is_authenticated, user.get_user);
    // app.route('api/login').get();
    // app.route('api/authorize/google/redirect');
}
