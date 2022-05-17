const createError = require("http-errors");
const Logs = require("../models/Logs");
const mongoose = require("mongoose");

const logError = async (_error, _table, _data, _uid, _method) => {
  let _id = _uid ? mongoose.Types.ObjectId(_uid) : null;
  let result;
  const now = new Date();
  let dataObj = new Logs({
    errorType: JSON.stringify(_error),
    errorMessage: _error.toString(),
    trace: _error.trace,
    requestOrigin: _table,
    data: JSON.stringify(_data),
    dateCreated: now.toISOString(),
    method: _method,
    uid: _id,
  });

  try {
    result = await Logs.create(dataObj);
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(`${_table}-${error}`);
  }

  if (!result) {
    throw new createError.NotFound(`Unable to log error`);
  }

  return result;
};

module.exports = logError;
