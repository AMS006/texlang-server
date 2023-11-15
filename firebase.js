require('dotenv').config()
const admin = require('firebase-admin');
const { credentials } = require('./src/utils/service_account_credential');

admin.initializeApp({
  credential: admin.credential.cert(credentials),
  storageBucket: "texlang.appspot.com",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { db ,bucket , admin}; 