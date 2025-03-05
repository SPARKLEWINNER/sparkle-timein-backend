const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const stringCapitalizeName = require("string-capitalize-name");
const mongoose = require("mongoose");
const User = require("../models/Users");
const Feedback = require('../models/Feedback')
const logError = require("../services/logger");
const logDevice = require("../services/devices");
const nodemailer = require("nodemailer");
const Mailer = require('../services/mailer')
const {emailVerificationHTML} = require("../helpers/mailFormat");
const axios = require("axios");
const maxAge = 3 * 24 * 60 * 60;
const create_token = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: maxAge });
};


var controllers = {
  get_user: async function (req, res) {
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });

    try {
      const result = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
        .lean()
        .exec();
      const store = await User.findOne({ company: result.company }).lean().exec(0);

      const surveyAnswer = await Feedback.findOne({
        userId: new mongoose.Types.ObjectId(id)
      }).lean().exec()


      if (!result)
        res.status(201).json({ success: false, msg: `No such user.` });

      let user = { ...result, store_id: store._id, survey_done: surveyAnswer ? true : false}
      res.json(user);
    } catch (err) {
      await logError(err, "Users", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_users: async function (req, res) {
    try {
      const result = await User.find({}).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(201).json(result);
    } catch (err) {
      await logError(err, "Users", null, null, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  update_user: async function (req, res) {
    const { firstName, lastName, password, company, position, email, phone } =
      req.body;
    const { id } = req.params;
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }

    try {
      await User.findOne({ _id: mongoose.Types.ObjectId(id) })
        .then((user) => {
          if (!user)
            return res
              .status(400)
              .json({ success: false, msg: `User not found ${id}` });

          user.password = password;
          user.firstName = firstName;
          user.lastName = lastName;
          user.displayName = firstName + " " + lastName;
          user.isVerified = true;
          user.isOnBoarded = true;
          user.company = company;
          user.position = position;
          user.email = email;
          user.phone = phone;

          user.save().then((result) => {
            if (!result)
              return res.status(400).json({
                success: false,
                msg: `Unable to update details ${id}`,
              });

            const token = create_token(result._id);
            res.cookie("jwt", token, { expire: new Date() + 9999 });
            return res.json(result);
          });
        })
        .catch((err) => console.log(err));
    } catch (err) {
      console.log(err);
      await logError(err, "Users", req.body, id, "PATCH");

      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  update_user_store: async function (req, res) {
    const { firstName, lastName, password, company, email, phone, role, prev } = req.body;
    const { id } = req.params;
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }

    if(password) {
      try {
        await User.findOne({ _id: mongoose.Types.ObjectId(id) })
          .then((user) => {
            if (!user)
              return res
                .status(400)
                .json({ success: false, msg: `User not found ${id}` });
            
            user.password = password;
            user.firstName = firstName;
            user.lastName = lastName;
            user.displayName = firstName + " " + lastName;
            user.isVerified = true;
            user.isOnBoarded = true;
            user.company = company;
            user.email = email;
            user.phone = phone;
  
            user.save().then((result) => {
              if (!result)
                return res.status(400).json({
                  success: false,
                  msg: `Unable to update details ${id}`,
                });
  
              const token = create_token(result._id);
              res.cookie("jwt", token, { expire: new Date() + 9999 });
              return res.json(result);
            });
          })
          .catch((err) => console.log(err));
      } catch (err) {
        console.log(err);
        await logError(err, "Users", req.body, id, "PATCH");
  
        return res.status(400).json({
          success: false,
          msg: "No such users",
        });
      }
    } else {
      if(role) {
        try {
          const result = await User.updateMany({company: prev}, { $set: { company: company } });

          if (!result)
            res.status(400).json({
              success: false,
              msg: `Unable to update account ${id}`,
            });
          const response = await fetch(`https://payroll-live.7star.com.ph/public/api/updateStoreName`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              old_store_name: prev,
              new_store_name: company
            })
          });
          if (!response.ok) {
            // Handle non-200 responses
            return res.status(response.status).json({
              success: false,
              message: 'Error fetching payroll info',
              error: await response.text() // Get error message from the response
            });
          }

          record = await response.json();
          if (record.success) {
            return res.status(200).json({
              success: true,
              message: 'Record fetched successfully',
              record
            });
          } else {
            return res.status(400).json({
              success: false,
              message: 'Failed to fetch record',
              record
            });
          }
          res.json(result);
        } catch (err) {
          await logError(err, "User.company_update", null, id, "PATCH");
          res
            .status(400)
            .json({ success: false, msg: `Unable to update account ${id}` });
        }  
      }
      else {
          try {
            const result = await User.findOneAndUpdate(
              { _id: mongoose.Types.ObjectId(id) },
              { company: company }
            );
            if (!result)
              res.status(400).json({
                success: false,
                msg: `Unable to update account ${id}`,
              });
            res.json(result);
          } catch (err) {
            await logError(err, "User.company_update", null, id, "PATCH");
            res
              .status(400)
              .json({ success: false, msg: `Unable to update account ${id}` });
          }

        } 
      }
      
    
  },

  update_store_location: async function (req, res) {
   const { long, lat } = req.body;
    const { id } = req.params;
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    } else {
      try {

        const location = {
          type: "Point",
          coordinates: [
            long,
            lat
          ]
        }
        const result = await User.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(id) },
          { location: location },
          { 
            new: true,
            upsert: true
          }
        ).exec();
        if (!result)
          res.status(400).json({
            success: false,
            msg: `Unable to update account ${id}`,
          });
        res.json(result);
      } catch (err) {
        console.log(err)
        await logError(err, "User.location_update", null, id, "PATCH");
        res
          .status(400)
          .json({ success: false, msg: `Unable to update account ${id}` });
      }
    }
  },
   update_user_password: async function (req, res) {
      const { id, password } = req.params;
      if (!id || !password)
        res
          .status(404)
          .json({ success: false, msg: `Invalid Request parameters.` });

      try {
        await User.findOne({ _id: mongoose.Types.ObjectId(id) })
          .then((user) => {
            if (!user)
              return res
                .status(400)
                .json({ success: false, msg: `User not found ${id}` });
            user.password = password;
            user.save().then((result) => {
              if (!result)
                return res.status(400).json({
                  success: false,
                  msg: `Unable to update details ${id}`,
                });

              const token = create_token(result._id);
              res.cookie("jwt", token, { expire: new Date() + 9999 });
              return res.json(result._id);
            });
          })
          .catch((err) => console.log(err));
      } catch (err) {
        console.log(err);
        await logError(err, "Users.update_user_password", id, "GET");

        return res.status(400).json({
          success: false,
          msg: "No such users",
        });
      }
    },
    set_reset_token: async function (req, res) {
      const { email, type } = req.body;
      
      try {
        const chkUser = await User.findOne({email: email}).lean().exec();
        if (!chkUser) {
          res.status(400).json({
            success: false,
            msg: "No such users",
          });
          return;
        }
        else {
          const token = Math.trunc(Math.random() * 999999)
          const result = await User.findOneAndUpdate({email: email}, {$set: {resetToken: token}})
          if (result) {
            const sendEmail = async (subject, htmlTemplate) => {
              try {
                await axios.post(
                  'https://api.resend.com/emails',
                  {
                    from: 'no-reply@sparkletimekeeping.com',
                    to: email,
                    subject,
                    html: htmlTemplate,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${process.env.RESEND_KEY}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
              } catch (error) {
                console.error("Error sending email:", error);
                throw new Error("Failed to send email");
              }
            };

            let subject = "";
            let htmlTemplate = "";
            if(type === 'forgot_password') {
               subject = "Forgot Password";
               htmlTemplate = emailVerificationHTML({ verificationToken: token });
            } else if(type === 'change_password') {
               subject = "Change Password";
               htmlTemplate = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #4a4a4a;">Sparkle Timekeeping</h2>
                </div>
                <p style="color: #4a4a4a; font-size: 16px;">Sparkling Hello!</p>
                <p style="color: #4a4a4a; font-size: 16px;">You have requested to change your password. Please use the following OTP code to complete the process:</p>
                <div style="background-color: #f7f7f7; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
                  <h1 style="color: #4285f4; letter-spacing: 5px; font-size: 32px; margin: 0;">${token}</h1>
                </div>
                <p style="color: #4a4a4a; font-size: 14px;">If you did not request this change, please ignore this email or contact support.</p>
                <p style="color: #4a4a4a; font-size: 14px;">This OTP will expire shortly for security reasons.</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 12px;">
                  <p>© ${new Date().getFullYear()} Sparkle Timekeeping. All rights reserved.</p>
                </div>
              </div>
            `;
            }

            await sendEmail(subject, htmlTemplate);

            return res.status(200).json({
              success: true,
              message: "OTP sent successfully",
            });
            /*let transporter = nodemailer.createTransport({
               host: process.env.SES_HOST,
               port: 587,
               secure: false, // true for 465, false for other ports
               auth: {
                 user: process.env.SES_USER, // generated ethereal user
                 pass: process.env.SES_PASS, // generated ethereal password
               },
             });
            let mailOptions = {
              from: 'no-reply@sparkles.com.ph',
              to: email,
              subject: 'Forgot Password',
              html: emailVerificationHTML({
                verificationToken: token,
              })
            };
            transporter.sendMail(mailOptions, function(error, info){
              if (error) {
                return res.status(400).json({
                  success: false,
                  msg: error,
                });
              } else {
                return res.status(200).json({
                  success: true,
                  msg: "Success",
                });
              }
            });*/
          }
        }
      } catch (err) {
        await logError(err, "Users", null, null, "GET");
        res.status(400).json({
          success: false,
          msg: "Something went wrong",
        });
      }
    },
    edit_profile_pic: async function (req, res) {
      const { id, image } = req.body;
      if (!id || !image) {
        return res.status(400).json({
          success: false,
          msg: "Missing required fields",
        });
      }
      try {
        const user = await User.findOne({ _id: mongoose.Types.ObjectId(id) });
        if (!user) {
          return res.status(400).json({
            success: false,
            msg: "User not found",
          });
        }
        user.image = image;
        await user.save();
        return res.status(200).json({
          success: true,
          msg: "Profile picture updated successfully",
        });
      } catch (err) {
        await logError(err, "Users", null, null, "GET");
        return res.status(500).json({
          success: false,
          msg: "Failed to update profile picture",
        });
      }
    },
    send_otp_for_mobile_change: async function (req, res) {
      const { userId, oldMobile, newMobile } = req.body;
      
      try {
        const user = await User.findOne({_id: userId});
        if (!user) {
          return res.status(400).json({
            success: false,
            msg: "User not found",
          });
        }
        console.log('🚀 ~ req.body:', user)
        const numberFormatOldPhone =
        String(oldMobile).charAt(0) +
        String(oldMobile).charAt(1) +
        String(oldMobile).charAt(2);

        if (numberFormatOldPhone !== "+63") {
          oldMobile = "+63" + oldMobile.substring(1);
        }
        
        if (user.phone !== oldMobile) {
          return res.status(400).json({
            success: false,
            msg: "Old mobile number is not valid",
          });
        }

        const numberFormatNewPhone =
        String(newMobile).charAt(0) +
        String(newMobile).charAt(1) +
        String(newMobile).charAt(2);

        if (numberFormatNewPhone !== "+63") {
          newMobile = "+63" + newMobile.substring(1);
        }

        if (numberFormatOldPhone === "+63") {
          oldMobile = "0" + oldMobile.substring(3);
        }
        
        
        if (user.phone === newMobile) {
          return res.status(400).json({
            success: false,
            msg: "New mobile number is the same as the old one",
          });
        }

        if (numberFormatNewPhone === "+63") {
          newMobile = "0" + newMobile.substring(3);
        }
        
        const otpNumber = Math.trunc(Math.random() * 999999)
        user.mobileChangeOtp = otpNumber
        user.mobileChangeOtpValidDate = new Date(Date.now() + 10 * 60 * 1000)
        await user.save()
    
        const messageForNewMobile = `Sparkling Hello! Here is your OTP code for Sparkle Timekeeping to change your Mobile Number: ${otpNumber}`
        const messageForOldMobile = `Sparkling Hello! Here is your OTP code for Sparkle Timekeeping to change your Mobile Number: ${otpNumber}`
        let token
        // Generate a new token
        const response = await axios.post(
          'https://svc.app.cast.ph/api/auth/signin',
          {
            username: process.env.CAST_USERNAME,
            password: process.env.CAST_PASSWORD
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        token = response.data.Token
        console.log('New token:', token)
        if(token) {
          const url = 'https://svc.app.cast.ph/api/announcement/send'

          const dataForNewMobile = {
            MessageFrom: "Sparkle",
            Message: messageForNewMobile,
            Recipients: [
              {
                "ContactNumber": newMobile
              }
            ]
          }
          
          console.log('🚀 ~ data:', data)

          const headers = {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          }
          const response = await axios.post(url, dataForNewMobile, {headers})
          if(response.status !== 200) {
              return res.status(500).json({
                success: false,
                msg: "Failed to send OTP. Please try again."
              });
          }

          const dataForOldMobile = {
            MessageFrom: "Sparkle",
            Message: messageForOldMobile,
            Recipients: [
              {
                "ContactNumber": oldMobile
              }
            ]
          }

          const responseForOldMobile = await axios.post(url, dataForOldMobile, {headers})
          if(responseForOldMobile.status !== 200) {
            return res.status(500).json({
              success: false,
              msg: "Failed to send OTP to old mobile number. Please try again."
            });
          }

          console.log('🚀 ~ response:', response.data)
          
        }
        

        return res.status(200).json({
          success: true,
          msg: "OTP sent successfully",
        });

      } catch (err) {
        await logError(err, "Users", null, null, "GET");
        return res.status(500).json({
          success: false,
          msg: "Failed to send OTP",
        });
      }
    },
    verify_mobile_change_otp: async function (req, res) {
      const { userId, otp, newMobile } = req.body;
      try {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(400).json({
            success: false,
            msg: "User not found",
          });
        }
        
        if (user.mobileChangeOtp !== otp) {
          return res.status(400).json({
            success: false,
            msg: "OTP is not valid",
          });
        }
        
        if (user.mobileChangeOtpValidDate < new Date()) {
          return res.status(400).json({
            success: false,
            msg: "OTP has expired",
          });
        }

        user.phone = newMobile
        await user.save()
        
        return res.status(200).json({
          success: true,
          msg: "Mobile number updated successfully",
        });
      } catch (err) {
        await logError(err, "Users", null, null, "GET");
        return res.status(500).json({
          success: false,
          msg: "Failed to verify OTP",
        });
      }
    },
    send_email_change_otps: async function (req, res) {
      const { userId, oldEmail, newEmail } = req.body;
      try {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(400).json({
            success: false,
            msg: "User not found",
          });
        }

        // Generate OTPs for both old and new email
        const oldEmailOtp = Math.trunc(Math.random() * 999999).toString().padStart(6, '0');
        const newEmailOtp = Math.trunc(Math.random() * 999999).toString().padStart(6, '0');

        // Set expiry time (30 minutes from now)
        const otpValidDate = new Date(Date.now() + 30 * 60 * 1000);

        // Update user with OTPs and pending new email
        user.oldEmailOtp = oldEmailOtp;
        user.newEmailOtp = newEmailOtp; 
        user.emailOtpValidDate = otpValidDate;
        await user.save();

        const htmlTemplateOld = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4a4a4a;">Sparkle Timekeeping</h2>
            </div>
            <p style="color: #4a4a4a; font-size: 16px;">Sparkling Hello!</p>
            <p style="color: #4a4a4a; font-size: 16px;">You have requested to change your email. Please use the following OTP code to complete the process:</p>
            <div style="background-color: #f7f7f7; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
              <h1 style="color: #4285f4; letter-spacing: 5px; font-size: 32px; margin: 0;">${oldEmailOtp}</h1>
            </div>
            <p style="color: #4a4a4a; font-size: 14px;">If you did not request this change, please ignore this email or contact support.</p>
            <p style="color: #4a4a4a; font-size: 14px;">This OTP will expire shortly for security reasons.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Sparkle Timekeeping. All rights reserved.</p>
            </div>
          </div>
        `;
        const htmlTemplateNew = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4a4a4a;">Sparkle Timekeeping</h2>
            </div>
            <p style="color: #4a4a4a; font-size: 16px;">Sparkling Hello!</p>
            <p style="color: #4a4a4a; font-size: 16px;">You have requested to change your email. Please use the following OTP code to complete the process:</p>
            <div style="background-color: #f7f7f7; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
              <h1 style="color: #4285f4; letter-spacing: 5px; font-size: 32px; margin: 0;">${newEmailOtp}</h1>
            </div>
            <p style="color: #4a4a4a; font-size: 14px;">If you did not request this change, please ignore this email or contact support.</p>
            <p style="color: #4a4a4a; font-size: 14px;">This OTP will expire shortly for security reasons.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Sparkle Timekeeping. All rights reserved.</p>
            </div>
          </div>
        `;
        const subject = "Email Change Verification";

        // Send emails with OTPs
        await Promise.all([
          Mailer.send_mail_resend(oldEmail, subject, htmlTemplateOld),
          Mailer.send_mail_resend(newEmail, subject, htmlTemplateNew)
        ]);

        return res.status(200).json({
          success: true,
          msg: "Verification codes sent successfully",
        });

      } catch (err) {
        await logError(err, "Users", null, null, "GET");
        return res.status(500).json({
          success: false,
          msg: "Failed to send OTP",
        });
      }
    },
    verify_email_change_otp: async function (req, res) {
      const { userId, emailType, otp, newEmail } = req.body;
      try {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(400).json({
            success: false,
            msg: "User not found",
          });
        }

        // Check if OTP is still valid
        const now = new Date();
        if (now > user.emailOtpValidDate) {
          return res.status(400).json({
            success: false,
            msg: "OTP has expired",
          });
        }

        // Verify OTP based on email type
        if (emailType === 'old' && otp !== user.oldEmailOtp) {
          return res.status(400).json({
            success: false,
            msg: "Invalid OTP",
          });
        }

        if (emailType === 'new' && otp !== user.newEmailOtp && (!newEmail || newEmail === '')) {
          return res.status(400).json({
            success: false,
            msg: "Invalid OTP", 
          });
        }

        // If verifying new email OTP, update the user's email
        if (emailType === 'new' && otp === user.newEmailOtp) {
          if(user.email === newEmail) {
            return res.status(400).json({
              success: false,
              msg: "New email is the same as the old one",
            });
          }

          if(newEmail && newEmail !== '') {
            user.email = newEmail;
            user.oldEmailOtp = '';
            user.newEmailOtp = '';
            user.emailOtpValidDate = null;
            await user.save();

            return res.status(200).json({
              success: true,
              msg: "OTP verified and email updated successfully",
            });
          } else {
            return res.status(400).json({
              success: false,
              msg: "New email is required",
            });
          }
        }

        return res.status(200).json({
          success: true,
          msg: "OTP verified successfully",
        });

      } catch (err) {
        await logError(err, "Users", null, null, "GET");
        return res.status(500).json({
          success: false,
          msg: "Failed to verify OTP",
        });
      }
    },
    verify_reset_token: async function (req, res) {
      const { email, token } = req.body;
      try {
        const chkUser = await User.findOne({email: email, resetToken: token}).lean().exec();
        if (!chkUser) {
          return res.status(400).json({
            success: false,
            msg: "Verification token is not valid",
          });
        }
        else {
            return res.status(200).json({
              success: true,
              msg: "Verified",
            });
        }
      } catch (err) {
        await logError(err, "Users", null, null, "GET");
        res.status(400).json({
          success: false,
          msg: "Verification token is not valid",
        });
      }
    },
    set_mpin: async function (req, res) {
      let { id, mpin, otp, phone } = req.body;
      
      try {
        if((!phone || phone === '') && (!id || id === '')) {
          return res.status(400).json({
            success: false,
            msg: "Phone/Id is required"
          });
        }
        const numberFormat =
          String(phone).charAt(0) +
          String(phone).charAt(1) +
          String(phone).charAt(2);

        if (numberFormat !== "+63") {
          phone = "+63" + phone.substring(1);
        }

        if(phone && phone.trim() !== '') {
          await User.findOne({ phone: phone })
          .then((user) => {
            if (!user)
              return res
                .status(400)
                .json({ success: false, msg: `User not found` });

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (user.changeMpinOtp !== otp || user.changeMpinOtpValidDate < fiveMinutesAgo || !otp || otp === '') return res
            .status(400)
            .json({ success: false, msg: `Wrong OTP/Invalid OTP` });

            user.mpin = user.encryptPassword(mpin);
            user.changeMpinOtp = ''
            user.save().then((result) => {
              if (!result)
                return res.status(400).json({
                  success: false,
                  msg: `Unable to set MPIN`,
                });
                
                return res.status(200).json({
                  success: true,
                  msg: "Success",
                })
            });
          })
        } else {
          if(!id || id === '') {
            return res.status(400).json({
              success: false,
              msg: "User ID/Phone is required"
            });
          }
          await User.findOne({ _id: mongoose.Types.ObjectId(id) })
          .then((user) => {
            if (!user)
              return res
                .status(400)
                .json({ success: false, msg: `User not found` });

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (user.changeMpinOtp !== otp || user.changeMpinOtpValidDate < fiveMinutesAgo || !otp || otp === '') return res
            .status(400)
            .json({ success: false, msg: `Wrong OTP/Invalid OTP` });

            user.mpin = user.encryptPassword(mpin);
            user.changeMpinOtp = ''
            user.save().then((result) => {
              if (!result)
                return res.status(400).json({
                  success: false,
                  msg: `Unable to set MPIN`,
                });
                
                return res.status(200).json({
                  success: true,
                  msg: "Success",
                })
            });
          })
        }
        
      } catch (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          msg: "Failed to set MPIN",
        });
      }
    },
    update_user_new_password: async function (req, res) {
      const { email, password } = req.body;
      let id;
      if (!email || !password)
        res
          .status(404)
          .json({ success: false, msg: `Invalid Request parameters.` });

      try {
        const chkUser = await User.findOne({email: email}).exec();
        if (chkUser) {
          id = chkUser._id;
          chkUser.password = password;
          const result = chkUser.save();
          if (!result) {
            return res.status(400).json({
              success: false,
              msg: `Unable to update details ${chkUser._id}`,
            });
          }
          else {
            const token = create_token(result._id);
            const expirationDate = new Date();
            expirationDate.setTime(expirationDate.getTime() + 9999);
            res.cookie("jwt", token, { expires: expirationDate }).json(result._id); 
            return "success"
          }
        }
        else {
          return res
            .status(400)
            .json({ success: false, msg: `User not found ${email}` });  
        }
        /*await User.findOne({ email: email })
          .then((user) => {
            if (!user)
              return res
                .status(400)
                .json({ success: false, msg: `User not found ${email}` });
            user.password = password;
            user.save().then((result) => {
              if (!result)
                return res.status(400).json({
                  success: false,
                  msg: `Unable to update details ${id}`,
                });

              const token = create_token(result._id);
              res.cookie("jwt", token, { expire: new Date() + 9999 });
              return res.json(result._id);
            });
          })
          .catch((err) => console.log(err));*/
      } catch (err) {
        console.log(err)
        return res.status(400).json({
          success: false,
          msg: "No such users",
        });
      }
    },
  };




module.exports = controllers;

/*
// READ (ONE)
router.get('/:id', (req, res) => {
  User.findById(req.params.id)
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.status(404).json({ success: false, msg: `No such user.` });
    });
});

// READ (ALL)
router.get('/', (req, res) => {
  User.find({})
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
    });
});

// CREATE
router.post('/', postLimiter, (req, res) => {

  // Validate the age
  let age = sanitizeAge(req.body.age);
  if (age < 5 && age != '') return res.status(403).json({ success: false, msg: `You're too young for this.` });
  else if (age > 130 && age != '') return res.status(403).json({ success: false, msg: `You're too old for this.` });

  let newUser = new User({
    name: sanitizeName(req.body.name),
    email: sanitizeEmail(req.body.email),
    age: sanitizeAge(req.body.age),
    gender: sanitizeGender(req.body.gender)
  });

  newUser.save()
    .then((result) => {
      res.json({
        success: true,
        msg: `Successfully added!`,
        result: {
          _id: result._id,
          name: result.name,
          email: result.email,
          age: result.age,
          gender: result.gender
        }
      });
    })
    .catch((err) => {
      if (err.errors) {
        if (err.errors.name) {
          res.status(400).json({ success: false, msg: err.errors.name.message });
          return;
        }
        if (err.errors.email) {
          res.status(400).json({ success: false, msg: err.errors.email.message });
          return;
        }
        if (err.errors.age) {
          res.status(400).json({ success: false, msg: err.errors.age.message });
          return;
        }
        if (err.errors.gender) {
          res.status(400).json({ success: false, msg: err.errors.gender.message });
          return;
        }
        // Show failed if all else fails for some reasons
        res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
      }
    });
});

// UPDATE
router.put('/:id', (req, res) => {

  // Validate the age
  let age = sanitizeAge(req.body.age);
  if (age < 5 && age != '') return res.status(403).json({ success: false, msg: `You're too young for this.` });
  else if (age > 130 && age != '') return res.status(403).json({ success: false, msg: `You're too old for this.` });

  let updatedUser = {
    name: sanitizeName(req.body.name),
    email: sanitizeEmail(req.body.email),
    age: sanitizeAge(req.body.age),
    gender: sanitizeGender(req.body.gender)
  };

  User.findOneAndUpdate({ _id: req.params.id }, updatedUser, { runValidators: true, context: 'query' })
    .then((oldResult) => {
      User.findOne({ _id: req.params.id })
        .then((newResult) => {
          res.json({
            success: true,
            msg: `Successfully updated!`,
            result: {
              _id: newResult._id,
              name: newResult.name,
              email: newResult.email,
              age: newResult.age,
              gender: newResult.gender
            }
          });
        })
        .catch((err) => {
          res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
          return;
        });
    })
    .catch((err) => {
      if (err.errors) {
        if (err.errors.name) {
          res.status(400).json({ success: false, msg: err.errors.name.message });
          return;
        }
        if (err.errors.email) {
          res.status(400).json({ success: false, msg: err.errors.email.message });
          return;
        }
        if (err.errors.age) {
          res.status(400).json({ success: false, msg: err.errors.age.message });
          return;
        }
        if (err.errors.gender) {
          res.status(400).json({ success: false, msg: err.errors.gender.message });
          return;
        }
        // Show failed if all else fails for some reasons
        res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
      }
    });
});

// DELETE
router.delete('/:id', (req, res) => {

  User.findByIdAndRemove(req.params.id)
    .then((result) => {
      res.json({
        success: true,
        msg: `It has been deleted.`,
        result: {
          _id: result._id,
          name: result.name,
          email: result.email,
          age: result.age,
          gender: result.gender
        }
      });
    })
    .catch((err) => {
      res.status(404).json({ success: false, msg: 'Nothing to delete.' });
    });
});

module.exports = router;

// Minor sanitizing to be invoked before reaching the database
sanitizeName = (name) => {
  return stringCapitalizeName(name);
}
sanitizeEmail = (email) => {
  return email.toLowerCase();
}
sanitizeAge = (age) => {
  // Return empty if age is non-numeric
  if (isNaN(age) && age != '') return '';
  return (age === '') ? age : parseInt(age);
}
sanitizeGender = (gender) => {
  // Return empty if it's neither of the two
  return (gender === 'm' || gender === 'f') ? gender : '';
}

*/
