const firebase = require('firebase');
const admin = require("firebase-admin");
const config = require('../../firebaseApp.json');
firebase.initializeApp(config);


const fb = {
    check_user: async function (req, res) {
        const { email } = req.body;
        try {
            await admin.auth().getUserByEmail(email)
                .then((user) => {
                    return true;
                })
                .catch((err) => {
                    return false;
                });
        }
        catch (err) {
            return false;
        }

    }
}

module.exports = fb;