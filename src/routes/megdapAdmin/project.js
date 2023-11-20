const express = require("express");

const {
  getUserProjects,
  updateProjectStatus,
  getPaymentPendingProjects,
  updatePaymentPendingProjects,
} = require("../../controllers/megdapAdmin/project");

const router = express.Router();

router.get("/user/:userId", getUserProjects);

router.get("/paymentPending", getPaymentPendingProjects);

router.put("/updateStatus", updateProjectStatus);

router.put("/updatePaymentStatus", updatePaymentPendingProjects);

module.exports = router;
