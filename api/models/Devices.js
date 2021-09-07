const mongoose = require("mongoose");
const { Schema } = mongoose;
const collectionName = "devices";
const data = {
  browser: String,
  source: String,
  version: String,
  os: String,
  platform: String,
  dateCreated: Date,
  uid: String,
};

const reportsSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model("Devices", reportsSchema, collectionName);
