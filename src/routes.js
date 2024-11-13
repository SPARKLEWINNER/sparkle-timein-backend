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
var videoTutorial = require("./controller/videoTutorial");
var UploadController = require('./services/upload')
var AnnouncementUploadController = require('./services/timein-upload')
var fcmTokenController = require('./controller/fcm')
const {messaging} = require('./services/firebase');

module.exports = function (app) {
  app.route("/").get(api.get_app_info);
  app.route("/api/users").get(auth.require_sign_in, user.get_users);
  app.route("/api/user/:id").get(auth.require_sign_in, user.get_user);
  app.route("/api/user/reset").post(user.set_reset_token);
  app.route("/api/user/verify").post(user.verify_reset_token);

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
    .route("/api/user/updateStore/:id")
    .patch(user.update_store_location);

  app
    .route("/api/user/updatePass/:id/:password")
    .get(user.update_user_password);

  app
    .route("/api/user/newPass")
    .post(user.update_user_new_password);

  app
    .route("/api/user/status/:id")
    .get(/*auth.require_sign_in,*/ reports.get_status_time);

  app
    .route("/api/user/storedistance")
    .post(reports.get_reports_store_distance);
  app
    .route("/api/user/time/:id")
    .post(auth.require_sign_in, reports.report_time);
  app
    .route("/api/special/time/:id")
    .post(reports.report_time);
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
    .route("/api/user/limited/records/:id")
    .get(
      /*auth.require_sign_in,
      auth.is_store_authenticated,*/
      reports.get_limited_reports
    );

  app
    .route("/api/user/limited/recordsV2")
    .get(
      /*auth.require_sign_in,
      auth.is_store_authenticated,*/
      reports.get_limited_reportsV2
    );

  app
    .route("/api/user/generate/password")
    .get(
      /*auth.require_sign_in,
      auth.is_store_authenticated,*/
      reports.generate_password
    ); 

  app
    .route("/api/user/validate/password/:token")
    .get(
      /*auth.require_sign_in,
      auth.is_store_authenticated,*/
      reports.validate_password
    ); 

  app
    .route("/api/user/records/bydate/:id/:date")
    .get(
/*      auth.require_sign_in,
      auth.is_store_authenticated,*/
      reports.get_reports_bydate
    ); 

  app
    .route("/api/store/records/:date")
    .post(
/*      auth.require_sign_in,
      auth.is_store_authenticated,*/
      reports.get_reports_store
    ); 

  app
    .route("/api/user/records/:id/:date")
    .get(
      auth.require_sign_in,
      auth.is_store_authenticated,
      reports.get_reports_range,
    );


  app.route("/api/record/:id").get(/*auth.require_sign_in, */reports.get_reports_by_id);

  app.route("/api/record/update/:id").patch(/*auth.require_sign_in, */reports.update_user_record);

  app.route("/api/record/delete/:id").get(/*auth.require_sign_in, */reports.remove_record);

  app.route("/api/record/delete/last/:id").get(/*auth.require_sign_in, */reports.remove_last_record);

  app
  .route("/api/user/recordsv2/:id/:startDate/:endDate")
  .get(
    //auth.require_sign_in,
    //auth.is_store_authenticated,
    reports.get_reports_rangev2,
  );

  app
    .route("/api/store/users/:id")
    .get(/*auth.require_sign_in, auth.is_store_authenticated,*/ stores.get_users);

  app
    .route("/api/users/company")
    .get(/*auth.require_sign_in, auth.is_store_authenticated, */reports.get_company);
app
    .route("/api/store/personnel")
    .post(/*auth.require_sign_in, auth.is_store_authenticated, */reports.get_store_personnel);

  app
    .route("/api/store/users/archive/:id")
    .get(auth.require_sign_in, auth.is_store_authenticated, stores.get_users_archived);

  app.route("/api/store/:id/user/:user_id/archive").get(auth.require_sign_in, stores.archive_user);

  app.route("/api/store/:id/user/:user_id/restore").get(auth.require_sign_in, auth.is_store_authenticated, stores.restore_user);

  app.route("/api/store/:id/user/:user_id").delete(auth.require_sign_in, auth.is_store_authenticated, stores.remove_user);

  app.route('/api/store/branch').post(auth.require_sign_in, auth.is_store_authenticated, auth.sign_up_branch)

  app.route('/api/store/branch/:id').get(auth.require_sign_in, auth.is_store_authenticated, stores.get_users_branch)

  app.route('/api/store/user').post(/*auth.require_sign_in, auth.is_store_authenticated,*/ stores.get_users_store)

  // ========================== FCM ================================ // 

  app.route("/api/users/fcm/:id").get(auth.require_sign_in, fcmTokenController.get_active_fcm_token)

  app.route("/api/users/fcm/:id/register").post(auth.require_sign_in, fcmTokenController.register_fcm_token)

  app.route("/api/users/fcm/:id/unregister").delete(auth.require_sign_in, fcmTokenController.unregister_fcm_token)

  app.post('/api/send-fcm', async (req, res) => {
    const { token, title, body } = req.body;
  
    if (!token || !title || !body) {
      return res.status(400).send('Missing parameters');
    }
  
    try {
      const message = {
        notification: {
          title,
          body
        },
        token
      };
  
      const response = await messaging.send(message);
      res.status(200).send(`Message sent successfully: ${response}`);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).send('Failed to send message');
    }
  });

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

  app.route("/api/otp/time-adjustment").post( auth.require_sign_in, auth.is_store_authenticated,stores.timeAdjustmentSendOtp)
  
  app.route("/api/otp/verification").post(auth.require_sign_in, auth.is_store_authenticated,stores.timeAdjustmentVerification)

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

  app.route("/api/active").post(reports.get_active_users); // get settings (no auth required)

  app.route("/api/coc").post(reports.set_company_coc); // get settings (no auth required)

  app.route("/api/get/coc").post(reports.get_company_coc); // get settings (no auth required)

  // Manual Timekeep Record

  app.route("/api/payroll").get(reports.get_payroll_records);

  app.route("/api/specific/payroll").post(reports.get_payroll_record);

  app.route("/api/payroll").post(reports.post_payroll_record); 

  // Scheduling

  app.route("/api/schedule").post(reports.post_schedule);

  app.route("/api/schedule/:id").get(reports.get_schedule); 
  
  app.route("/api/all/schedule/").post(reports.get_all_schedule); 
  
  app.route("/api/range/schedule/").post(reports.get_schedule_range); 

  // Uploading S3

  app.route("/api/upload").post(UploadController.create_url);

  app.route("/api/aws/upload").post(AnnouncementUploadController.create_url);

  app.route("/api/announcement/upload").post(reports.post_announcement);

  // Announcements

  app.route("/api/announcements").post(reports.get_announcement);

  app.route("/api/edit/announcements").post(reports.edit_announcement);

  app.route("/api/announcements/:id").get(reports.get_announcement_by_id);

  app.route("/api/delete/announcements/:id").get(reports.delete_announcement);

  // Subscription

  app.route("/api/subscription").post(subscription.post_subscription);
  
  app.route("/api/get/subscription").post(subscription.get_subscription);

  app.route("/api/delete/report").get(reports.delete_reports);

  // Payroll

  app.route("/api/payslip-info").post(reports.payslip_gateway);

  app.route("/api/edit").post(reports.edit_company);

  app.route("/api/edit-store").get(settings.restore_user);

  // Video Tutorial

  app.route("/api/store/video").post(auth.require_sign_in, auth.is_store_authenticated,videoTutorial.addVideoTutorial);
  app.route("/api/store/:_id").put( auth.require_sign_in, auth.is_store_authenticated, videoTutorial.editVedioTutorial);
  app.route("/api/store/video/:_id").delete(auth.require_sign_in, auth.is_store_authenticated, videoTutorial.deleteVideoTutorial);
  app.route("/api/store/videos/:company").get(auth.require_sign_in,videoTutorial.getAllVideos);
  app.route("/api/records/remove-schedules/:id").get(reports.remove_many_schedules);
  app.route("/api/checklist").post(reports.get_checklist);
  app.route("/api/checklist/add").post(reports.post_checklist);
  app.route("/api/checklist/delete").post(reports.delete_checklist);
  app.route("/api/verify/password").post(reports.verify_password);
  app.route("/api/store/:id").get(reports.get_store);
  app.route("/api/email/update").post(reports.update_email);
  app.route("/api/verify/phone").post(reports.verify_password_phone);
  app.route("/api/breaklist").post(reports.get_breaklist);
  app.route("/api/schedule/v2").post(reports.get_schedule_all_v2);
  app.route("/api/reports/breaklist").post(reports.get_reports_for_breaklist);
  app.route("/api/save/breaklist").post(reports.post_save_breaklist);
  app.route("/api/list/breaklist").post(reports.get_store_breaklist);
  app.route("/api/list/breaklistapproved").post(reports.get_store_breaklist_approved);
  app.route("/api/breaklistinfo").post(reports.get_breaklistinfo);
  app.route("/api/delete/breaklist").post(reports.delete_breaklist);
  app.route("/api/approve/breaklist").post(reports.post_approve_breaklist);
  app.route("/api/delete/schedule/:id").get(reports.delete_schedule);
  app.route("/api/edit/schedule").post(reports.edit_schedule);
  app.route("/api/new/stores").get(reports.get_new_store_account);
  app.route("/api/approve/store/:id").get(reports.approve_new_store_account);
  app.route("/api/decline/store/:id").get(reports.decline_new_store_account);
  app.route("/api/edit/profile/:id").post(reports.edit_user_name);
  app.route("/api/edit/company/:id").post(reports.edit_user_company);
  app.route("/api/logs/:id").get(reports.get_logs_by_id);
  app.route("/api/register/store").post(reports.register_store);
  app.route("/api/group/store/:id").get(reports.get_group_store);
  app.route("/api/user/store").post(stores.get_users_bystore);
  app.route("/api/archiveduser/store").post(stores.get_archivedusers_bystore);
  app.route("/api/schedule/store").post(reports.get_schedule_all_v2_bystore);
  app.route("/api/report/store").post(reports.get_reports_rangev2_bystore);
};
