const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const stringCapitalizeName = require("string-capitalize-name");
const mongoose = require("mongoose");
const User = require("../models/Users");
const logError = require("../services/logger");
const logDevice = require("../services/devices");

const maxAge = 3 * 24 * 60 * 60;
const create_token = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: maxAge });
};

var controllers = {
  get_user: async function (req, res) {
    const { id } = req.params;
    if (!id) res.status(404).json({ success: false, msg: `No such user.` });

    try {
      const result = await User.findOne({ _id: mongoose.Types.ObjectId(id) })
        .lean()
        .exec();
      const store = await User.findOne({ company: result.company }).lean().exec(0);
      if (!result)
        res.status(201).json({ success: false, msg: `No such user.` });
      res.json({ ...result, store_id: store._id });
    } catch (err) {
      await logError(err, "Users", null, id, "GET");
      res.status(400).json({ success: false, msg: err });
      throw new createError.InternalServerError(err);
    }
  },
  get_users: async function (req, res) {
    try {
      const result = await User.find({}).lean().exec();
      if (!result) {
        res.status(400).json({
          success: false,
          msg: "No such users",
        });
        return;
      }
      return res.status(201).json(result);
    } catch (err) {
      await logError(err, "Users", null, null, "GET");
      res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  update_user: async function (req, res) {
    const { firstName, lastName, password, company, position, email, phone } =
      req.body;
    const { id } = req.params;
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }

    try {
      await User.findOne({ _id: mongoose.Types.ObjectId(id) })
        .then((user) => {
          if (!user)
            return res
              .status(400)
              .json({ success: false, msg: `User not found ${id}` });

          user.password = password;
          user.firstName = firstName;
          user.lastName = lastName;
          user.displayName = firstName + " " + lastName;
          user.isVerified = true;
          user.isOnBoarded = true;
          user.company = company;
          user.position = position;
          user.email = email;
          user.phone = phone;

          user.save().then((result) => {
            if (!result)
              return res.status(400).json({
                success: false,
                msg: `Unable to update details ${id}`,
              });

            const token = create_token(result._id);
            res.cookie("jwt", token, { expire: new Date() + 9999 });
            return res.json(result);
          });
        })
        .catch((err) => console.log(err));
    } catch (err) {
      console.log(err);
      await logError(err, "Users", req.body, id, "PATCH");

      return res.status(400).json({
        success: false,
        msg: "No such users",
      });
    }
  },
  update_user_store: async function (req, res) {
    const { firstName, lastName, password, company, email, phone } = req.body;
    const { id } = req.params;
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    }

    if(password) {
      try {
        await User.findOne({ _id: mongoose.Types.ObjectId(id) })
          .then((user) => {
            if (!user)
              return res
                .status(400)
                .json({ success: false, msg: `User not found ${id}` });
            
            user.password = password;
            user.firstName = firstName;
            user.lastName = lastName;
            user.displayName = firstName + " " + lastName;
            user.isVerified = true;
            user.isOnBoarded = true;
            user.company = company;
            user.email = email;
            user.phone = phone;
  
            user.save().then((result) => {
              if (!result)
                return res.status(400).json({
                  success: false,
                  msg: `Unable to update details ${id}`,
                });
  
              const token = create_token(result._id);
              res.cookie("jwt", token, { expire: new Date() + 9999 });
              return res.json(result);
            });
          })
          .catch((err) => console.log(err));
      } catch (err) {
        console.log(err);
        await logError(err, "Users", req.body, id, "PATCH");
  
        return res.status(400).json({
          success: false,
          msg: "No such users",
        });
      }
    } else {
      try {
        const result = await User.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(id) },
          { company: company }
        );
        if (!result)
          res.status(400).json({
            success: false,
            msg: `Unable to update account ${id}`,
          });
        res.json(result);
      } catch (err) {
        await logError(err, "User.company_update", null, id, "PATCH");
        res
          .status(400)
          .json({ success: false, msg: `Unable to update account ${id}` });
      }

    }
    
  },

  update_store_location: async function (req, res) {
   const { long, lat } = req.body;
    const { id } = req.params;
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing fields`,
      });
    } else {
      try {

        const location = {
          type: "Point",
          coordinates: [
            long,
            lat
          ]
        }
        const result = await User.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(id) },
          { location: location },
          { 
            new: true,
            upsert: true
          }
        ).exec();
        console.log(result);
        if (!result)
          res.status(400).json({
            success: false,
            msg: `Unable to update account ${id}`,
          });
        res.json(result);
      } catch (err) {
        console.log(err)
        await logError(err, "User.location_update", null, id, "PATCH");
        res
          .status(400)
          .json({ success: false, msg: `Unable to update account ${id}` });
      }
    }
  },
};



module.exports = controllers;

/*
// READ (ONE)
router.get('/:id', (req, res) => {
  User.findById(req.params.id)
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.status(404).json({ success: false, msg: `No such user.` });
    });
});

// READ (ALL)
router.get('/', (req, res) => {
  User.find({})
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
    });
});

// CREATE
router.post('/', postLimiter, (req, res) => {

  // Validate the age
  let age = sanitizeAge(req.body.age);
  if (age < 5 && age != '') return res.status(403).json({ success: false, msg: `You're too young for this.` });
  else if (age > 130 && age != '') return res.status(403).json({ success: false, msg: `You're too old for this.` });

  let newUser = new User({
    name: sanitizeName(req.body.name),
    email: sanitizeEmail(req.body.email),
    age: sanitizeAge(req.body.age),
    gender: sanitizeGender(req.body.gender)
  });

  newUser.save()
    .then((result) => {
      res.json({
        success: true,
        msg: `Successfully added!`,
        result: {
          _id: result._id,
          name: result.name,
          email: result.email,
          age: result.age,
          gender: result.gender
        }
      });
    })
    .catch((err) => {
      if (err.errors) {
        if (err.errors.name) {
          res.status(400).json({ success: false, msg: err.errors.name.message });
          return;
        }
        if (err.errors.email) {
          res.status(400).json({ success: false, msg: err.errors.email.message });
          return;
        }
        if (err.errors.age) {
          res.status(400).json({ success: false, msg: err.errors.age.message });
          return;
        }
        if (err.errors.gender) {
          res.status(400).json({ success: false, msg: err.errors.gender.message });
          return;
        }
        // Show failed if all else fails for some reasons
        res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
      }
    });
});

// UPDATE
router.put('/:id', (req, res) => {

  // Validate the age
  let age = sanitizeAge(req.body.age);
  if (age < 5 && age != '') return res.status(403).json({ success: false, msg: `You're too young for this.` });
  else if (age > 130 && age != '') return res.status(403).json({ success: false, msg: `You're too old for this.` });

  let updatedUser = {
    name: sanitizeName(req.body.name),
    email: sanitizeEmail(req.body.email),
    age: sanitizeAge(req.body.age),
    gender: sanitizeGender(req.body.gender)
  };

  User.findOneAndUpdate({ _id: req.params.id }, updatedUser, { runValidators: true, context: 'query' })
    .then((oldResult) => {
      User.findOne({ _id: req.params.id })
        .then((newResult) => {
          res.json({
            success: true,
            msg: `Successfully updated!`,
            result: {
              _id: newResult._id,
              name: newResult.name,
              email: newResult.email,
              age: newResult.age,
              gender: newResult.gender
            }
          });
        })
        .catch((err) => {
          res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
          return;
        });
    })
    .catch((err) => {
      if (err.errors) {
        if (err.errors.name) {
          res.status(400).json({ success: false, msg: err.errors.name.message });
          return;
        }
        if (err.errors.email) {
          res.status(400).json({ success: false, msg: err.errors.email.message });
          return;
        }
        if (err.errors.age) {
          res.status(400).json({ success: false, msg: err.errors.age.message });
          return;
        }
        if (err.errors.gender) {
          res.status(400).json({ success: false, msg: err.errors.gender.message });
          return;
        }
        // Show failed if all else fails for some reasons
        res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
      }
    });
});

// DELETE
router.delete('/:id', (req, res) => {

  User.findByIdAndRemove(req.params.id)
    .then((result) => {
      res.json({
        success: true,
        msg: `It has been deleted.`,
        result: {
          _id: result._id,
          name: result.name,
          email: result.email,
          age: result.age,
          gender: result.gender
        }
      });
    })
    .catch((err) => {
      res.status(404).json({ success: false, msg: 'Nothing to delete.' });
    });
});

module.exports = router;

// Minor sanitizing to be invoked before reaching the database
sanitizeName = (name) => {
  return stringCapitalizeName(name);
}
sanitizeEmail = (email) => {
  return email.toLowerCase();
}
sanitizeAge = (age) => {
  // Return empty if age is non-numeric
  if (isNaN(age) && age != '') return '';
  return (age === '') ? age : parseInt(age);
}
sanitizeGender = (gender) => {
  // Return empty if it's neither of the two
  return (gender === 'm' || gender === 'f') ? gender : '';
}

*/