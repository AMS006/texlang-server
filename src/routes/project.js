const express = require("express");

const isUser = require("../middleware/isUser");
const {
  addProject,
  getProjects,
  getProjectDetailsUser,
} = require("../controllers/project");

const router = express.Router();

router.get("/", isUser, getProjects);

router.get("/:id", isUser, getProjectDetailsUser);

router.post("/", isUser, addProject);

module.exports = router;
