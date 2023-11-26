const express = require("express");

const {
  loginMegdapAdmin,
  getMegdapAdminUser,
  addUser,
} = require("../../controllers/megdapAdmin/user");
const canAccess = require("../../middleware/canAccess");
const { Roles } = require("../../constants");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

router.post("/login", loginMegdapAdmin);

router.get("/", authenticate,canAccess([Roles.MEGDAP_ADMIN,Roles.COMPANY_ADMIN]), getMegdapAdminUser);

router.post("/add", authenticate,canAccess([Roles.MEGDAP_ADMIN]), addUser);

module.exports = router;
