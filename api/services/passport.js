// import all the things we need  
const GoogleStrategy = require('passport-google-oauth20').Strategy
const jwt = require('jsonwebtoken'); // to generate signed token
const User = require('../models/user');

module.exports = function (passport) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: '/api/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                //get the user data from google 
                const newUser = {
                    googleId: profile.id,
                    displayName: profile.displayName,
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    image: profile.photos[0].value,
                    email: profile.emails[0].value
                }


                newUser.hashed_password = undefined;
                newUser.salt = undefined;
                newUser.verificationCode = Math.floor(100000 + Math.random() * 900000);
                try {
                    //find the user in our database 
                    let user = await User.findOne({ googleId: profile.id })
                    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

                    if (user) {
                        //If user present in our database.
                        const response = { ...user._doc, token };
                        done(null, response)
                    } else {
                        // if user is not preset in our database save user data to database.
                        user = await User.create(newUser)
                        const response = { ...user._doc, token };
                        done(null, response)
                    }
                } catch (err) {
                    console.error(err)
                }
            }
        )
    )

    // used to serialize the user for the session
    passport.serializeUser((user, done) => {
        done(null, user._id)
    })

    // used to deserialize the user
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => done(err, user))
    })
}