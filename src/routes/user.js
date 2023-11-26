const express = require("express");

const {
  loginUser,
  sendCode,
  forgotPassword,
  changePassword,
  getUser,
  resetPassword,
} = require("../controllers/user");
const authenticate = require("../middleware/authenticate");
const canAccess = require("../middleware/canAccess");
const { Roles } = require("../constants");

const router = express.Router();

router.get("/", authenticate,canAccess([Roles.USER]), getUser);

router.post("/sendCode", sendCode);

router.post("/login", loginUser);

router.post("/resetPassword", resetPassword);

router.post("/forgotPassword", forgotPassword);

router.post("/changePassword", authenticate,canAccess([Roles.USER,Roles.ADMIN]), changePassword);

module.exports = router;
