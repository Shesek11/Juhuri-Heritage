const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

// Serialize/Deserialize users not strictly needed for stateless JWT, 
// but Passport requires it if using sessions. We will likely skip sessions 
// and handle tokens in the callback, but minimal config is good practice.
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        done(null, users[0]);
    } catch (err) {
        done(err, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true // Important for xCloud/Nginx proxies
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            const name = profile.displayName;
            const googleId = profile.id;
            const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

            // 1. Check if user exists by email
            const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            let user = existingUsers[0];

            if (user) {
                // User exists, update Google ID/Photo if missing?
                // For now, just return the user.
                // Optionally update last login
                await db.query('UPDATE users SET last_login_date = NOW() WHERE id = ?', [user.id]);
                return done(null, user);
            }

            // 2. If new user, create them
            // Determine role (default 'user')
            const role = 'user'; // Admin check can happen later or manually

            const [result] = await db.query(
                `INSERT INTO users (email, name, role, last_login_date, joined_at, contributions_count, xp, level, current_streak) 
                 VALUES (?, ?, ?, NOW(), NOW(), 0, 0, 1, 0)`,
                [email, name, role]
            );

            // Log registration
            await db.query(
                `INSERT INTO system_logs (event_type, description, user_id, user_name) VALUES (?, ?, ?, ?)`,
                ['USER_REGISTER_OAUTH', `נרשם דרך גוגל: ${name}`, result.insertId, name]
            );

            // Fetch the new user to return
            const [newUsers] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            return done(null, newUsers[0]);

        } catch (err) {
            console.error("Google Auth Error:", err);
            return done(err, null);
        }
    }
));

module.exports = passport;
