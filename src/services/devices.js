const createError = require("http-errors");
const Devices = require("../models/Devices");
const mongoose = require("mongoose");

const logDevice = async (_agent, _table, _uid, _method) => {
  let _id = _uid ? mongoose.Types.ObjectId(_uid) : null;
  let result;
  let { browser, source, version, os, platform } = _agent;
  const now = new Date();
  let dataObj = new Devices({
    browser: browser,
    source: source,
    version: version,
    os: os,
    platform: platform,
    dateCreated: now.toISOString(),
    uid: _id,
  });

  try {
    result = await Devices.create(dataObj);
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(`${_table}-${error}`);
  }

  if (!result) {
    throw new createError.NotFound(`Unable to log device`);
  }

  return result;
};

module.exports = logDevice;
