const mongoose = require('mongoose')
const {Schema, Types} = mongoose

const collectionName = 'fcmtokens'

const fcmTokenSchema = new Schema(
  {
    userId: {type: Types.ObjectId, ref: 'Users'},
    fcmToken: {
      default: '',
      type: String
    },
    device: {
      default: '',
      type: String
    }
  },
  {timestamps: true}
)

module.exports = mongoose.model('FCMTOKEN', fcmTokenSchema, collectionName)
