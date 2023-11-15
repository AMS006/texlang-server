const express = require('express');

const { addNewTranslator } = require('../../controllers/megdapAdmin/translator');

const router = express.Router();

router.post('/add', addNewTranslator);

module.exports = router