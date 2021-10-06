"use strict";
const passport = require("passport");
var api = require("./controller/default");
var user = require("./controller/users");
var auth = require("./controller/auth");
var reports = require("./controller/reports");
var stores = require("./controller/stores");
var settings = require("./controller/settings");

module.exports = function (app) {
  app.route("/").get(api.get_app_info);
  app.route("/api/users").get(auth.require_sign_in, user.get_users);
  app.route("/api/user/:id").get(auth.require_sign_in, user.get_user);

  app.route("/api/login").post(auth.sign_in);
  app.route("/api/employee/register").post(auth.sign_up);
  app.route("/api/store/register").post(auth.store_sign_up);
  app.route("/api/phone").post(auth.phone_sign_in);
  app.route("/api/phone/signup").post(auth.phone_sign_up);
  app
    .route("/api/phone/verify/:id")
    .post(auth.require_sign_in, auth.phone_verify);

  app
    .route("/api/google")
    .get(passport.authenticate("google", { scope: ["profile", "email"] }));

  app
    .route("/api/google/callback")
    .get(
      passport.authenticate("google", { failureRedirect: "/api/google" }),
      auth.google_sign_in_callback
    );

  app.route("/api/signout").get(auth.require_sign_in, auth.sign_out);

  app.route("/api/user/:id").patch(auth.require_sign_in, user.update_user);

  app
    .route("/api/user/store/:id")
    .patch(auth.require_sign_in, user.update_user_store);

  app
    .route("/api/user/status/:id")
    .get(auth.require_sign_in, reports.get_status_time);
  app
    .route("/api/user/time/:id")
    .post(auth.require_sign_in, reports.report_time);

  app
    .route("/api/user/records/:id")
    .get(
      auth.require_sign_in,
      auth.is_store_authenticated,
      reports.get_reports
    );

  app
    .route("/api/user/records/:id/:start_date/:end_date")
    .get(
      auth.require_sign_in,
      auth.is_store_authenticated,
      reports.get_reports_range,
    );

  app
    .route("/api/store/users/:id")
    .get(auth.require_sign_in, auth.is_store_authenticated, stores.get_users);

  app
    .route("/api/store/users/archive/:id")
    .get(auth.require_sign_in, auth.is_store_authenticated, stores.get_users_archived);

  app.route("/api/store/:id/user/:user_id/archive").patch(auth.require_sign_in, auth.is_store_authenticated, stores.archive_user);

  app.route("/api/store/:id/user/:user_id/restore").patch(auth.require_sign_in, auth.is_store_authenticated, stores.restore_user);

  app.route("/api/store/:id/user/:user_id").delete(auth.require_sign_in, auth.is_store_authenticated, stores.remove_user);


  // SETTINGS

  app.route("/api/settings").get(auth.require_sign_in, settings.get_settings);

  app.route("/api/settings/relog").get(auth.require_sign_in, settings.get_setting_force_relog);

  app.route("/api/settings/create").post(auth.require_sign_in, settings.post_settings);
};
