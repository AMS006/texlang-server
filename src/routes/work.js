const multer = require("multer");
const express = require("express");

const isUser = require("../middleware/isUser");
const { uploadWork, addComment } = require("../controllers/work");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", isUser, upload.single("file"), uploadWork);

router.post("/comment/:id", isUser, addComment);

module.exports = router;
