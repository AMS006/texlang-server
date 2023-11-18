const express = require('express');
const { generateInvoice, getApprovePendingInvoices, getGenerateInvoiceWorks, getInvoiceDetails, getAllInvoices, updateInvoiceStatus } = require('../../controllers/megdapAdmin/invoice');

const router = express.Router();

router.get('/generateInvoiceWorks', getGenerateInvoiceWorks);

router.post('/generate',generateInvoice);

router.put('/updateStatus/:id',updateInvoiceStatus);

router.get('/approvePending', getApprovePendingInvoices);

router.get('/invoiceDetails/:id', getInvoiceDetails);

router.get('/allInvoices',getAllInvoices);

module.exports = router;