const bcrypt = require("bcryptjs");
const { db, admin } = require("../../../firebase");
const generateToken = require("../../utils/generateToken");
const sendEmail = require("../../utils/sendEmail");
const { ADMIN_JWT_EXPIRE_DAYS, Roles } = require("../../constants");

exports.loginMegdapAdmin = async (req, res) => {
  try {
    const { userName, password } = req.body;

    if(!userName || !password) return res.status(400).json({message:"Invalid Request"});

    let userRef = db.collection("users").where("email", "==", userName);

    const userData = await userRef.get();

    if (userData.empty) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const userDoc = userData.docs[0].data();
    if (
      userDoc.role !== Roles.MEGDAP_ADMIN &&
      userDoc.role !== Roles.COMPANY_ADMIN
    ) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    if (userDoc.role === Roles.MEGDAP_ADMIN && password !== userDoc.password) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    if (userDoc.role === Roles.COMPANY_ADMIN) {
      const isPasswordMatch = await bcrypt.compare(password, userDoc.password);
      if (!isPasswordMatch)
        return res.status(401).json({ message: "Invalid Credentials" });
    }

    const user = {
      id: userData.docs[0].id,
      name: userDoc?.userName,
      role: userDoc?.role,
      companyId: userDoc?.companyId,
    };

    const token = generateToken(user, ADMIN_JWT_EXPIRE_DAYS);

    return res.status(200).json({ user, token });
  } catch (error) {
    console.log("Megdap-Admin-Login", error.message);
    return res.status(500).json({ message: "Someting went wrong" });
  }
};

exports.getMegdapAdminUser = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    return res.status(200).json({ user });
  } catch (error) {
    console.log("Megdap-Admin-Get", error.message);
    return res.status(500).json({ message: "Someting went wrong" });
  }
};

exports.addUser = async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      password,
      isAdmin,
      companyId,
      companyName,
    } = req.body;

    const userRef = db.collection("users");
    const userQuery = await userRef.where("email", "==", email).get();
    if (!userQuery.empty)
      return res.status(400).json({ message: "User already exists" });

    const userDoc = db.collection("users").doc();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const batch = db.batch();
    const userData = {
      email,
      firstName,
      lastName,
      password: hashedPassword,
      role: isAdmin ? Roles.COMPANY_ADMIN : Roles.USER,
      companyId,
      companyName,
      status: true,
      totalBilledAmount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(userDoc, userData);
    const html = `<p>Dear Customer,</p>
            <br />
            <p>An account has been created for you on <a href="https://texlang-client-qjvrxcjtna-uc.a.run.app/" target="_blank">Texlang</a>. Please use the below credentials to login.</p>
            <p>Email: ${email}</p>
            <p>Password: ${password}</p>`;

    const subject = "Texlang Account Created";
    await sendEmail(email, subject, html);

    await batch.commit();
    return res.status(200).json({ message: "User added successfully" });
  } catch (error) {
    console.log("Megdap-Admin-Add-User", error.message);
    return res.status(500).json({ message: "Someting went wrong" });
  }
};
