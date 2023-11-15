const express = require('express');

const { getWorks, getInvoiceWorks, getJobWiseData } = require('../../controllers/admin/work');

const router = express.Router();

router.get('/projectWork/:projectId', getWorks)

router.get('/projectWork/invoice/:projectId', getInvoiceWorks)

router.get('/jobWiseData',getJobWiseData)

module.exports = router;