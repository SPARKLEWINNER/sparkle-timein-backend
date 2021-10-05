const mongoose = require("mongoose");
const { Schema } = mongoose;
const collectionName = "settings";
const data = {
    type: String,
    value: Boolean,
    dateCreated: Date,
};

const settingsSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model("Settings", settingsSchema, collectionName);
