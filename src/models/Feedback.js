const mongoose = require('mongoose')
const {Schema, Types} = mongoose

const collectionName = 'feedback'

const fcmTokenSchema = new Schema(
  {
    userId: {type: Types.ObjectId, ref: 'User'},
    rating: {
      type: Number,
    },
    feedback: {
      type: String
    }
  },
  {timestamps: true}
)

module.exports = mongoose.model('FEEDBACK', fcmTokenSchema, collectionName)
