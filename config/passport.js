const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        // check if user already exists
        let user = await User.findOne({
          $or: [{ googleId: profile.id }, { email }],
        });

        if (user) {
          // update googleId if they registered manually before
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // create new user
        user = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          // phoneNumber is required in your schema — handle this below
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

module.exports = passport;
