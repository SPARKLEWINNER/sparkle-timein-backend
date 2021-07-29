const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const morgan = require('morgan');
const socket = require('socket.io');
const routes = require('./api/routes');
const port = process.env.PORT || 8000;
const app = express();
require('dotenv').config();

// Connect to the database
mongoose.connect(process.env.MONGO_KEY, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
}).then(() => console.log(`MongoDB Connected... - ${process.env.MONGO_KEY}`))
  .catch(err => console.log(err));

// Instantiate express
app.enable('trust proxy'); // We are using this for the express-rate-limit middleware See: https://github.com/nfriedly/express-rate-limit
app.use(express.json()); // Set body parser middleware
app.use(morgan('dev'));
app.use(cookieParser());
app.use(cors()); // Enable cross-origin for apex purpose;
// app.use(express.static('public')); // Set public folder using built-in express.static middleware this will hide the default page of api
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  res.header('Access-Control-Expose-Headers', 'X-Total-Count')
  next()
});

routes(app);
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const io = socket(server);  // Set up socket.io
let online = 0;
io.on('connection', (socket) => {
  online++;
  console.log(`Socket ${socket.id} connected.`);
  console.log(`Online: ${online}`);
  io.emit('visitor enters', online);

  socket.on('add', data => socket.broadcast.emit('add', data));
  socket.on('update', data => socket.broadcast.emit('update', data));
  socket.on('delete', data => socket.broadcast.emit('delete', data));

  socket.on('disconnect', () => {
    online--;
    console.log(`Socket ${socket.id} disconnected.`);
    console.log(`Online: ${online}`);
    io.emit('visitor exits', online);
  });
});
