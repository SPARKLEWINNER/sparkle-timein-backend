const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const collectionName = "users";
const crypto = require("crypto");
const uuid = require("uuid").v1;
const data = {
  googleId: {
    type: String,
    default: null,
  },
  displayName: {
    type: String,
    default: null,
  },
  firstName: {
    type: String,
    default: null,
  },
  lastName: {
    type: String,
    default: null,
  },
  image: {
    type: String,
    default: null,
  },
  company: {
    type: String,
    default: null,
  },
  position: {
    type: String,
    default: null,
  },
  email: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  verificationCode: {
    type: String,
    default: null,
  },
  hashed_password: {
    type: String,
    default: null,
  },
  resetToken: {
    type: String,
    default: null,
  },
  expireToken: Date,
  salt: String,
  role: {
    type: Number,
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  isOnBoarded: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  parentCompany: {
    type: String,
    default: null,
  },
  location: {
    type: Object,
    default: null,
  },
};
const userSchema = new Schema(data, { timestamps: true });
userSchema
  .virtual("password") // Here 'password' is now a property on User documents.
  .set(function (pass) {
    this._password = pass;
    this.salt = uuid();
    this.hashed_password = this.encryptPassword(pass);
  })
  .get(function () {
    return this._password;
  });

userSchema.methods = {
  authenticate: function (plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  },
  encryptPassword: function (password) {
    if (!password) return "";
    try {
      return crypto
        .createHmac("sha1", this.salt)
        .update(password)
        .digest("hex");
    } catch (err) {
      return "";
    }
  },
};

// static method to login user
userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email }).lean().exec();
  if (!user) return false;
  let encryptPassword = crypto
    .createHmac("sha1", user.salt)
    .update(password)
    .digest("hex");

  console.log(encryptPassword, user.hashed_password)

  if (encryptPassword !== user.hashed_password) return false;


  return user;
};

module.exports = mongoose.model("User", userSchema, collectionName);

// const mongoose = require('mongoose');
// const unique = require('mongoose-unique-validator');
// const validate = require('mongoose-validator');

// const nameValidator = [
//   validate({
//     validator: 'isLength',
//     arguments: [0, 40],
//     message: 'Name must not exceed {ARGS[1]} characters.'
//   })
// ];

// const emailValidator = [
//   validate({
//     validator: 'isLength',
//     arguments: [0, 40],
//     message: 'Email must not exceed {ARGS[1]} characters.'
//   }),
//   validate({
//     validator: 'isEmail',
//     message: 'Email must be valid.'
//   })
// ];

// const ageValidator = [
//   // TODO: Make some validations here...
// ];

// const genderValidator = [
//   // TODO: Make some validations here...
// ];

// // Define the database model
// const UserSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, 'Name is required.'],
//     validate: nameValidator
//   },
//   email: {
//     type: String,
//     required: [true, 'Email is required.'],
//     unique: true,
//     validate: emailValidator
//   },
//   age: {
//     type: Number,
//     validate: ageValidator
//   },
//   gender: {
//     type: String,
//     validate: genderValidator
//   }
// });

// // Use the unique validator plugin
// UserSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

// const User = module.exports = mongoose.model('user', UserSchema);
