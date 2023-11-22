const express = require("express");
const {
  generateInvoice,
  getApprovePendingInvoices,
  getGenerateInvoiceWorks,
  getInvoiceDetails,
  getAllInvoices,
  updateInvoiceStatus,
  getInvoicesToSend,
  sendInvoiceEmailToUser,
} = require("../../controllers/megdapAdmin/invoice");

const router = express.Router();

router.get("/generateInvoiceWorks", getGenerateInvoiceWorks);

router.post("/generate", generateInvoice);

router.put("/updateStatus/:id", updateInvoiceStatus);

router.get("/approvePending", getApprovePendingInvoices);

router.get("/invoiceDetails/:id", getInvoiceDetails);

router.get("/allInvoices", getAllInvoices);

router.get("/toSend", getInvoicesToSend);

router.post("/sendEmail", sendInvoiceEmailToUser);

module.exports = router;
