const express = require('express');

const { getProjectDetailsAdmin, getAllProjects, getLatestProject, getProjectInvoices } = require('../../controllers/admin/project');

const router = express.Router();

router.get('/projectDetail/:id', getProjectDetailsAdmin)

router.get('/companyProjects', getAllProjects)

router.get('/latestProjects', getLatestProject)

router.get('/invoices',getProjectInvoices)

module.exports = router;