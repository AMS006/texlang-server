const express = require("express");

const authenticate = require("../../middleware/authenticate");
const canAccess = require("../../middleware/canAccess");
const { Roles } = require("../../constants");

const router = express.Router();

router.use("/user", require("./user"));

router.use("/company", authenticate,canAccess([Roles.MEGDAP_ADMIN]), require("./company"));

router.use("/project", authenticate,canAccess([Roles.MEGDAP_ADMIN]), require("./project"));

router.use("/work", authenticate,canAccess([Roles.MEGDAP_ADMIN]), require("./work"));

router.use("/translator", authenticate,canAccess([Roles.MEGDAP_ADMIN]), require("./translator"));

router.use("/invoice", authenticate, require("./invoice"));

module.exports = router;
