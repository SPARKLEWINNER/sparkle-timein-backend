"use strict";
const passport = require("passport");
var api = require("./controller/default");
var user = require("./controller/users");
var auth = require("./controller/auth");
var reports = require("./controller/reports");
var stores = require("./controller/stores");
var settings = require("./controller/settings");
var subscription = require("./controller/subscription");
var billing = require("./controller/billing");

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
    .route("/api/user/workmate_time/:id")
    .post(auth.require_sign_in, reports.report_workmate_time);

  app
    .route("/api/user/records/:id")
    .get(
      auth.require_sign_in,
      auth.is_store_authenticated,
      reports.get_reports
    );

  app
    .route("/api/user/records/:id/:date")
    .get(
      auth.require_sign_in,
      auth.is_store_authenticated,
      reports.get_reports_range,
    );

  app
  .route("/api/user/recordsv2/:id/:startDate/:endDate")
  .get(
    auth.require_sign_in,
    auth.is_store_authenticated,
    reports.get_reports_rangev2,
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

  app.route('/api/store/branch').post(auth.require_sign_in, auth.is_store_authenticated, auth.sign_up_branch)

  app.route('/api/store/branch/:id').get(auth.require_sign_in, auth.is_store_authenticated, stores.get_users_branch)

  // ========================== Admin ================================ // 

  // Authentication
  app.route("/api/v2/login").post(auth.sign_in_v2); // separate endpoint for backoffice 

  app
    .route("/api/v2/google")
    .get(passport.authenticate("google", { scope: ["profile", "email"] })); // separate endpoint for backoffice (same controller from v1)


  // Users 
  app.route("/api/v2/users").get(auth.require_sign_in, auth.is_store_authenticated, stores.get_users_list); // get all users role: 0

  app.route("/api/v2/users/:id").get(auth.require_sign_in, user.get_user); // get all store users

  app.route("/api/v2/stores").get(auth.require_sign_in, auth.is_store_authenticated, stores.get_store_lists); // get all users role : 1


  // Subscription
  app.route('/api/v2/subscriptions/:id').get(auth.require_sign_in, auth.is_admin_authenticated, subscription.get_subscription)

  app.route('/api/v2/subscriptions').get(auth.require_sign_in, auth.is_admin_authenticated, subscription.get_subscriptions)

  app.route('/api/v2/subscriptions').post(auth.require_sign_in, auth.is_admin_authenticated, subscription.post_subscription)

  app.route('/api/v2/subscriptions/:id').patch(auth.require_sign_in, auth.is_admin_authenticated, subscription.patch_subscription_details)

  // Billing
  app.route('/api/v2/billing/:id').get(auth.require_sign_in, auth.is_admin_authenticated, billing.get_billing_details)

  app.route('/api/v2/billing').post(auth.require_sign_in, auth.is_admin_authenticated, billing.post_billing_details)

  app.route('/api/v2/billing/:id').patch(auth.require_sign_in, auth.is_admin_authenticated, billing.patch_billing_details_only)

  app.route('/api/v2/billing/subscription/:id').patch(auth.require_sign_in, auth.is_admin_authenticated, billing.patch_billing_details)

  // Settings 

  app.route("/api/settings").get(auth.require_sign_in, settings.get_settings); // get database driven settings

  app.route("/api/settings/create").post(auth.require_sign_in, settings.post_settings); // post database drive settings

  app.route("/api/settings/relog").get(settings.get_setting_force_relog); // get settings (no auth required)

};
