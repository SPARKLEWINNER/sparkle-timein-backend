const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
  },
  displayName: {
    type: String,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  image: {
    type: String,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
    default: null
  },
  verificationCode: {
    type: String,
    default: null
  },
  hashed_password: {
    type: String,
  },
  resetToken: String,
  expireToken: Date,
  salt: String,
  role: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('User', UserSchema)

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
