const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const validator = require("validator");

const { db } = require("../../firebase");
const sendEmail = require("../utils/sendEmail");
const generateToken = require("../utils/generateToken");
const { USER_JWT_EXPIRE_DAYS } = require("../constants");

exports.loginUser = async (req, res) => {
  try {
    const { email, password, code } = req.body;

    if (!email || !password || !code)
      return res.status(400).json({ message: "Plzz provide all fields" });

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid Email Id" });
    }
    const userCollection = db.collection("users");
    const userSnapshot = await userCollection.where("email", "==", email).get();

    if (userSnapshot.empty)
      return res.status(404).json({ message: "Invalid Credentials" });

    const userData = userSnapshot.docs[0].data();
    if (!userData.status) {
      return res.status(400).json({ message: "Email Id Deactivated" });
    }

    const userId = userSnapshot.docs[0].id;

    const codeMatch = userData?.verificationCode == code;
    if (!codeMatch)
      return res.status(400).json({ message: "Invalid Verification Code" });

    const passwordMatch = await bcrypt.compare(password, userData?.password);
    if (!passwordMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    const user = {
      id: userId,
      name: userData?.firstName + " " + userData?.lastName,
      email: userData?.email,
      role: userData?.role,
      companyId: userData?.companyId,
      companyName: userData?.companyName,
    };

    const token = generateToken(user, USER_JWT_EXPIRE_DAYS);

    return res.status(200).json({ user, token });
  } catch (error) {
    console.log("User-Login : ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.sendCode = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userCollection = db.collection("users");
    const userSnapshot = await userCollection.where("email", "==", email).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ message: "Invalid Credentials" });
    }
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    const passwordMatch = await bcrypt.compare(password, userData?.password);
    if (!passwordMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    if (!userData.status) {
      return res.status(400).json({ message: "Email Id Deactivated" });
    }
    const code = crypto.randomInt(0, 1000000000);
    const html = `<p>Dear Customer, <br />
                    The Security code for your login process is: ${code}`;

    const subject = "Security Code for Login";
    await userDoc.ref.update({ verificationCode: code });

    await sendEmail(email, subject, html);

    return res
      .status(200)
      .json({ message: "Verification code send to Email Id" });
  } catch (error) {
    console.log("Send Email : ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = req.user;

    if (!user) return res.status(404).json({ message: "No User Found" });

    return res.status(200).json({ user });
  } catch (error) {
    console.log("Get User Details: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { newPassword, currentPassword } = req.body;
    const userDocRef = db.collection("users").doc(user.id);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User Not Found" });
    }
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      userDoc.data().password,
    );
    if (!passwordMatch)
      return res
        .status(400)
        .json({ message: "Current Password does not match" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await userDocRef.update({
      password: hashedPassword,
    });

    return res.status(200).json({ message: "Password Changed Successfully" });
  } catch (error) {
    console.log("Password-Change: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const userCollection = db.collection("users");
    const userSnapshot = await userCollection.where("email", "==", email).get();
    if (userSnapshot.empty) {
      return res
        .status(404)
        .json({ message: "User with email not registered" });
    }
    const code = crypto.randomInt(0, 1000000000);
    const html = `<p>Dear Customer, <br />
        The Security code to reset your password is : ${code}`;

    await sendEmail(email, html);

    const userDoc = userSnapshot.docs[0];
    await userDoc.ref.update({ forgotPasswordCode: code });

    return res
      .status(200)
      .json({ message: "Verification code send to Email Id" });
  } catch (error) {
    console.log("Forgot-Password : ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword, code } = req.body;

    const userCollection = db.collection("users");
    const userSnapshot = await userCollection.where("email", "==", email).get();
    if (userSnapshot.empty) {
      return res
        .status(404)
        .json({ message: "User with email not registered" });
    }
    const userData = userSnapshot.docs[0].data();
    const userId = userSnapshot.docs[0].id;
    const codeMatch = userData.forgotPasswordCode == code;
    if (!codeMatch)
      return res.status(400).json({ message: "Invalid Verification Code" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const userDoc = userSnapshot.docs[0];
    await userDoc.ref.update({ password: hashedPassword, userId });

    return res.status(200).json({ message: "Password Updated Successfully" });
  } catch (error) {
    console.log("Update-Password: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
