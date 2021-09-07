// import all the things we need
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken"); // to generate signed token
const User = require("../models/Users");

const maxAge = 3 * 24 * 60 * 60;
const create_token = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: maxAge });
};

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        let admins = [
          "eduardo.quintos23@gmail.com",
          "d.ilagan@sparkles.com.ph",
          "j.staana@sparkles.com.ph",
        ];
        let role = admins.includes(profile.emails[0].value) ? 99 : 1;
        //get the user data from google
        const newUser = {
          googleId: profile.id,
          displayName: profile.displayName,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          image: profile.photos[0].value,
          email: profile.emails[0].value,
          role: role,
          isVerified: true,
        };

        newUser.hashed_password = undefined;
        newUser.salt = undefined;
        newUser.verificationCode = Math.floor(100000 + Math.random() * 900000);
        try {
          //find the user in our database
          let user = await User.findOne({ googleId: profile.id }).lean().exec();
          if (user) {
            const token = create_token(user._id);
            //If user present in our database.
            const response = { ...user, token };
            done(null, response);
          } else {
            let isEmailExist = await User.findOne({
              email: profile.emails[0].value,
            })
              .lean()
              .exec();
            if (isEmailExist) {
              const result = await User.findOneAndUpdate(
                { email: profile.emails[0].value },
                { googleId: profile.id, image: profile.photos[0].value }
              );
              const token = create_token(isEmailExist._id);
              const response = { ...result._doc, token };

              done(null, response);
            } else {
              // if user is not present in our database save user data to database.
              user = await User.create(newUser);
              const token = create_token(user._id);
              const response = { ...user._doc, token };
              done(null, response);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    )
  );

  // used to serialize the user for the session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // used to deserialize the user
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user));
  });
};
