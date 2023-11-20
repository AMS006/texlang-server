const express = require("express");

const isUser = require("../middleware/isUser");
const {
  loginUser,
  sendCode,
  forgotPassword,
  changePassword,
  getUser,
  resetPassword,
} = require("../controllers/user");

const router = express.Router();

router.get("/", isUser, getUser);

router.post("/sendCode", sendCode);

router.post("/login", loginUser);

router.post("/resetPassword", resetPassword);

router.post("/forgotPassword", forgotPassword);

router.post("/changePassword", isUser, changePassword);

module.exports = router;
