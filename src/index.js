const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const morgan = require("morgan");
const routes = require("./routes");
const sockets = require("./sockets/request");
const passport = require("passport");
const port = process.env.PORT || 7001;
const app = express();
const useragent = require("express-useragent");
const cron = require('node-cron');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
var mysql = require('mysql');

const sms_no_timeouts = require('./jobs/sms_no_timeouts')



require("dotenv").config();
require("./services/passport")(passport);
require("./services/notif")


// Connect to the database
mongoose
  .connect(process.env.MONGO_KEY, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(async () => {
    console.log(`Database Connected`)
  })
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

server.setTimeout(60000);

// const io = require('./socket').init(server);
const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

io.on("connection", (_socket) => {
  sockets(io, _socket);
});



// cron.schedule('*/5 * * * *', async () => {
//   sms_no_timeouts()
// });

// Run cronjob

/*cron.schedule('**6 * * * *', () => {
  fetch("https://api.heroku.com/apps/sparkle-time-keep/dynos", {
    method: 'DELETE',
    mode: 'cors',
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
});*/

// function cronTimein (id, location) {

//   const now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
//   const _previous = {}
//   fetch(`https://timekeeping-real-time.herokuapp.com/api/user/status/${id}`, {
//     method: 'GET', // *GET, POST, PUT, DELETE, etc.
//     mode: 'cors', // no-cors, *cors, same-origin
//     cache: 'no-cache',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/vnd.heroku+json; version=3',
//     },
//   })
//   .then(async (response) => {
//     const r = await response.json()
//     fetch(`https://timekeeping-real-time.herokuapp.com/api/special/time/${id}`, {
//     method: 'POST', // *GET, POST, PUT, DELETE, etc.
//     mode: 'cors', // no-cors, *cors, same-origin
//     cache: 'no-cache',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/vnd.heroku+json; version=3',
//     },
//     body: JSON.stringify({ status: "time-in", location: location, logdate: now, previous: r[r.length -1]._id })
//     })
//     .then(async (response) => {
//       console.log("Time-in Success")
//     })
//     .catch(function (err) {
//       console.log("Unable to fetch -", err);
//     }); 
//   })
//   .catch(function (err) {
//     console.log("Unable to fetch -", err);
//   });
// }

// function cronTimeOut (id, location) {
//   const now = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
//   let _previous
//   fetch(`https://timekeeping-real-time.herokuapp.com/api/user/status/${id}`, {
//     method: 'GET', // *GET, POST, PUT, DELETE, etc.
//     mode: 'cors', // no-cors, *cors, same-origin
//     cache: 'no-cache',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/vnd.heroku+json; version=3',
//     },
//   })
//   .then(async (response) => {
//     const r = await response.json()
//     fetch(`https://timekeeping-real-time.herokuapp.com/api/special/time/${id}`, {
//     method: 'POST', // *GET, POST, PUT, DELETE, etc.
//     mode: 'cors', // no-cors, *cors, same-origin
//     cache: 'no-cache',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/vnd.heroku+json; version=3',
//     },
//     body: JSON.stringify({ status: "time-out", location: location, logdate: now, previous: r[r.length -1]._id })
//   })
//   .then(async (response) => {
//     console.log("Time-out Success")
//   })
//   .catch(function (err) {
//     console.log("Unable to fetch -", err);
//   }); 
//   })
//   .catch(function (err) {
//     console.log("Unable to fetch -", err);
//   });
// }

// cron.schedule('37 7 * * 1-6', () => {
//   const locationV1 = {
//     latitude: 14.685210776473351,
//     longitude: 121.04094459783593,
//   }
//   cronTimein("63e247b452b472002d008ab1", locationV1)

// });


// cron.schedule('07 19 * * 1-6', async () => {
//   const locationV1 = {
//     latitude: 14.685210776473351,
//     longitude: 121.04094459783593,
//   }
//   const locationV2 = {
//     latitude: 14.525547,
//     longitude: 121.067896,
//   }
//   await cronTimeOut('63e247b452b472002d008ab1', locationV1)
// });

/*cron.schedule('20 23 * * 1-6', async () => {
  const locationV1 = {
    latitude: 14.685210776473351,
    longitude: 121.04094459783593,
  }
  const locationV2 = {
    latitude: 14.525547,
    longitude: 121.067896,
  }
  await cronTimeOut('62bb925753f9b300378b6062', locationV1)
});*/



