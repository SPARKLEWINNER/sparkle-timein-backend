"use strict";
const passport = require("passport");
var api = require("../controller/default");
var user = require("../controller/users");
var auth = require("../controller/auth");
var reports = require("../controller/reports");
var stores = require("../controller/stores");

const {
  add_user,
  get_user,
  get_users,
  delete_users,
} = require("./stores");
let online = 0;
module.exports = function (io, socket) {
  // account name - account id - room id (store)
  socket.on("connected", ({ name, uuid, _id }, callback) => {
    console.log(`User connected - ${name}`);
    const { user, error } = add_user(socket.id, name, uuid, _id);
    if (error) return callback(error);

    socket.join(user._id);
    socket.in(_id).emit("notification", {
      title: "Someone's here",
      description: `${user.name} just entered the room`,
    });

    io.in(_id).emit("users", get_users(_id));
    callback();
  });

  socket.on("update_status", (status) => {
    const user = get_user(socket.id);
    if (!user || !user._id) return;
    console.log("update_status", user);
    io.in(user._id).emit("receive_status", {
      user: user.name,
      status: status,
    });
  });

  socket.on("get_users", ({ _id }) => {
    io.in(_id).emit("users", get_users(_id));
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    const user = delete_users(socket.id);
    if (user) {
      io.in(user._id).emit("notification", {
        title: "Someone just left",
        description: `${user.name} just left the room`,
      });
      io.in(user._id).emit("users", get_users(user._id));
    }
  });
};
