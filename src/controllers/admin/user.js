const bcrypt = require("bcryptjs");
const validator = require("validator");
const admin = require("firebase-admin");

const { db } = require("../../../firebase");
const sendEmail = require("../../utils/sendEmail");
const { Roles } = require("../../Constants");

exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const user = req.user;
    if (!user) return res.status(402).json({ message: "Unauthorized" });

    if (
      validator.isEmpty(firstName) ||
      validator.isEmpty(lastName) ||
      validator.isEmpty(email) ||
      validator.isEmpty(password)
    ) {
      return res.status(400).json({ message: "Invalid Request" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid Email Id" });
    }

    const userCollection = db.collection("users");
    const userSnapshot = await userCollection.where("email", "==", email).get();

    if (!userSnapshot.empty)
      return res.status(400).json({ message: "User already Registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const batch = db.batch();
    const date = admin.firestore.FieldValue.serverTimestamp();
    const userRef = db.collection("users").doc();
    const userData = {
      firstName,
      lastName,
      email,
      companyId: user?.companyId,
      companyName: user?.companyName,
      password: hashedPassword,
      totalBilledAmount: 0,
      role: Roles.USER,
      status: true,
      createdAt: date,
    };
    batch.set(userRef, userData);

    const html = `<p>Dear Customer,</p>
            <br />
            <p>An account has been created for you on <a href="https://texlang-client-qjvrxcjtna-uc.a.run.app/" target="_blank">Texlang</a>. Please use the below credentials to login.</p>
            <p>Email: ${email}</p>
            <p>Password: ${password}</p>`;

    const subject = "Texlang Account Created";
    await sendEmail(email, subject, html);

    await batch.commit();
    return res.status(201).json({ message: "User Registered" });
  } catch (error) {
    console.log("User Registration : ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getAllUser = async (req, res) => {
  try {
    const userCollection = db.collection("users");
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const userQuery = await userCollection
      .where("companyId", "==", user?.companyId)
      .orderBy("createdAt", "desc")
      .get();

    const users = userQuery.docs.map((data) => {
      const user = data.data();
      const id = data.id;
      return {
        id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        role: user.role,
        status: user.status,
        email: user?.email,
        billedAmount: user?.totalBilledAmount,
      };
    });

    return res.status(200).json({ users });
  } catch (error) {
    console.log("Get All Users: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (!req.user) return res.status(400).json({ message: "Invalid Request" });
    const { firstName, lastName, role, id } = req.body;
    if (!id) return res.status(400).json({ message: "Invalid Request" });

    const userRef = db.collection("users").doc(id);

    await userRef.update({ firstName, lastName, role });

    return res.status(200).json({ message: "User Updated" });
  } catch (error) {
    console.log("User Update: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.changeUserStatus = async (req, res) => {
  try {
    if (!req.user) return res.status(400).json({ message: "Invalid Request" });

    const { id, status } = req.body;
    if (!id) return res.status(400).json({ message: "Invalid Request" });

    const userRef = db.collection("users").doc(id);

    await userRef.update({ status });

    return res.status(200).json({ message: "User Status Updated" });
  } catch (error) {
    console.log("User Status Update: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
