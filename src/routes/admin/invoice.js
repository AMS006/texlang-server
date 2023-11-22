const {
  getProjectInvoices,
  generateProjectInvoice,
  getProjectInvoiceDetails,
} = require("../../controllers/admin/invoice");

const router = require("express").Router();

router.get("/all", getProjectInvoices);

router.post("/project/generate", generateProjectInvoice);

router.get("/project/details/:id", getProjectInvoiceDetails);

module.exports = router;
