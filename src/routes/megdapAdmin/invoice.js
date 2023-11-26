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
const canAccess = require("../../middleware/canAccess");
const { Roles } = require("../../constants");

const router = express.Router();

// To generate invoice works
router.get("/generateInvoiceWorks",canAccess([Roles.MEGDAP_ADMIN]), getGenerateInvoiceWorks);

router.post("/generate",canAccess([Roles.MEGDAP_ADMIN]), generateInvoice);

router.put("/updateStatus/:id",canAccess([Roles.MEGDAP_ADMIN]), updateInvoiceStatus);

router.get("/approvePending",canAccess([Roles.MEGDAP_ADMIN]), getApprovePendingInvoices);

router.get("/invoiceDetails/:id",canAccess([Roles.MEGDAP_ADMIN,Roles.COMPANY_ADMIN]), getInvoiceDetails);

router.get("/allInvoices",canAccess([Roles.MEGDAP_ADMIN]), getAllInvoices);

router.get("/toSend",canAccess([Roles.MEGDAP_ADMIN]), getInvoicesToSend);

router.post("/sendEmail",canAccess([Roles.MEGDAP_ADMIN]), sendInvoiceEmailToUser);

module.exports = router;
