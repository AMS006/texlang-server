const express = require("express");
const multer = require("multer");

const {
  getDownloadProjectWorks,
  getUploadProjectWorks,
  getUserWorksForUpdate,
  updateUserWorks,
  uploadUserProjectWork,
  getWorkForCompanyBilling,
} = require("../../controllers/megdapAdmin/work");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/downloadProject/:projectId", getDownloadProjectWorks);

router.get("/uploadProject/:projectId", getUploadProjectWorks);

router.get("/userWorksForUpdate/:projectId", getUserWorksForUpdate);

router.get("/userWorksForCompanyBilling", getWorkForCompanyBilling);

router.post(
  "/uploadCustomerFile",
  upload.single("file"),
  uploadUserProjectWork,
);

router.put("/updateUserWork", updateUserWorks);

module.exports = router;
