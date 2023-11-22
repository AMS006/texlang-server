const express = require("express");
const {
  getApprovePendingInvoices,
  updateInvoiceDetails,
} = require("../../controllers/companyAdmin");

const router = express.Router();

router.get("/invoice/approvePending", getApprovePendingInvoices);

router.put("/invoice/approve/:id", updateInvoiceDetails);

module.exports = router;
