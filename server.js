const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const morgan = require("morgan");
const routes = require("./api/routes");
const passport = require("passport");
const port = process.env.PORT || 7000;
const app = express();
require("dotenv").config();
require("./api/services/passport")(passport);

// Connect to the database
mongoose
  .connect(process.env.MONGO_KEY, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log(`Database Connected`))
  .catch((err) => console.log(err));

// Instantiate express
app.enable("trust proxy"); // We are using this for the express-rate-limit middleware See: https://github.com/nfriedly/express-rate-limit
app.use(express.json()); // Set body parser middleware
app.use(morgan("dev"));
app.use(cookieParser());
app.use(cors()); // Enable cross-origin for apex purpose;
// app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Expose-Headers", "X-Total-Count");
  next();
});

routes(app);
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// const io = require('./socket').init(server);
const io = require("socket.io")(server, {
  cors: { origin: "*" },
});
let online = 0;
io.on("connection", (socket) => {
  socket.on("connected", (data) => {
    online++;
    io.emit("visitor enters", online);
  });

  socket.on("e-connected", (data) => {
    io.emit(`e-connected-${data.sid}`, data);
  });

  socket.on("e-action", (data) => {
    console.log("e-action", data);
    io.emit(`e-action`, data);
  });

  socket.on("e-time-in", (data) => socket.broadcast.emit("e-time-in", data));
  socket.on("e-time-out", (data) => socket.broadcast.emit("e-time-out", data));

  socket.on("add", (data) => socket.broadcast.emit("add", data));
  socket.on("update", (data) => socket.broadcast.emit("update", data));
  socket.on("delete", (data) => socket.broadcast.emit("delete", data));

  socket.on("disconnect", () => {
    if (online > 0) {
      online--;
    }
    io.emit("visitor exits", online);
  });

  // console.log(online);
});
