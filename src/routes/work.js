const multer = require("multer");
const express = require("express");

const { uploadWork, addComment } = require("../controllers/work");
const canAccess = require("../middleware/canAccess");
const authenticate = require("../middleware/authenticate");
const { Roles } = require("../constants");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", authenticate,canAccess([Roles.USER,Roles.ADMIN]), upload.single("file"), uploadWork);

router.post("/comment/:id", authenticate,canAccess([Roles.USER,Roles.ADMIN]), addComment);

module.exports = router;
