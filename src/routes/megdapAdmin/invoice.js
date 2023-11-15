const express = require('express');
const { generateInvoice, getApprovePendingInvoices, getGenerateInvoiceWorks, approveInvoices, getInvoiceDetails } = require('../../controllers/megdapAdmin/invoice');

const router = express.Router();

router.get('/generateInvoiceWorks', getGenerateInvoiceWorks);

router.post('/generate',generateInvoice);

router.put('/approve',approveInvoices);

router.get('/approvePending', getApprovePendingInvoices)

router.get('/invoiceDetails/:id', getInvoiceDetails)

module.exports = router;