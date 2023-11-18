const express = require('express');

const { addNewTranslator, getTranslatorsSourceLanguages, getTargetLanguages, getTranslators } = require('../../controllers/megdapAdmin/translator');

const router = express.Router();

router.post('/add', addNewTranslator);

router.get('/sourceLanguages', getTranslatorsSourceLanguages);

router.get('/targetLanguages', getTargetLanguages);

router.get('/', getTranslators);

module.exports = router