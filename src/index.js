const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const morgan = require("morgan");
const routes = require("./routes");
const sockets = require("./sockets/request");
const passport = require("passport");
const port = process.env.PORT || 7000;
const app = express();
const useragent = require("express-useragent");
const cron = require('node-cron');
const fetch = require('node-fetch');
require("dotenv").config();
require("./services/passport")(passport);

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
app.use(useragent.express()); // device request origin
routes(app);
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// const io = require('./socket').init(server);
const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

io.on("connection", (_socket) => {
  sockets(io, _socket);
});

// Run cronjob
cron.schedule('*/10 * * * *', () => {
  fetch("https://api.heroku.com/apps/sparkle-time-keep/dynos", {
    method: 'DELETE', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.heroku+json; version=3',
      'Authorization': 'Bearer 1a7ca021-0b51-4d98-b188-c7240a9b3504'
    },
  })
    .then((response) => {
      console.log("Restart Dyno Success")
    })
    .catch(function (err) {
      console.log("Unable to fetch -", err);
    });
});
