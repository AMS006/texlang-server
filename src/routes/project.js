const express = require("express");

const {
  addProject,
  getProjects,
  getProjectDetailsUser,
} = require("../controllers/project");
const authenticate = require("../middleware/authenticate");
const canAccess = require("../middleware/canAccess");
const { Roles } = require("../constants");

const router = express.Router();

router.get("/", authenticate,canAccess([Roles.USER,Roles.ADMIN,Roles.COMPANY_ADMIN]), getProjects);

router.get("/:id", authenticate,canAccess([Roles.USER,Roles.ADMIN,Roles.COMPANY_ADMIN]), getProjectDetailsUser);

router.post("/", authenticate,canAccess([Roles.USER,Roles.ADMIN,Roles.COMPANY_ADMIN]), addProject);

module.exports = router;
