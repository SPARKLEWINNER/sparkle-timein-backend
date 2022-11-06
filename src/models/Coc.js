const mongoose = require("mongoose");
const { Schema } = mongoose;
const collectionName = "coc";
const data = {
  company: {
    type: String,
    default: null,
  },
  link: {
    type: String,
    default: null,
  },
};

const cocSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model("Coc", cocSchema, collectionName);
