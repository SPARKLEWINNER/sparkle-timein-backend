const mongoose = require("mongoose");
const { Schema } = mongoose;
const collectionName = "logs";
const data = {
  errorType: String,
  errorMessage: String,
  trace: String,
  requestOrigin: String,
  data: String,
  dateCreated: Date,
  uid: String,
  method: String,
};

const reportsSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model("Logs", reportsSchema, collectionName);
