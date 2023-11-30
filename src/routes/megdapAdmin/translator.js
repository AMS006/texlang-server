const express = require("express");

const {
  addNewTranslator,
  getTranslatorsSourceLanguages,
  getTargetLanguages,
  getTranslators,
  assignWorkToTranslator,
  getAllTranslators,
  getTranslatorDetails,
  getReAssignTranslatorWorks,
  getTranslatorToReAssignWork,
  reAssignWork,
} = require("../../controllers/megdapAdmin/translator");

const router = express.Router();

router.post("/add", addNewTranslator);

router.post("/assignWork",assignWorkToTranslator);

router.get("/sourceLanguages", getTranslatorsSourceLanguages);

router.get("/targetLanguages", getTargetLanguages);

router.get("/all", getAllTranslators);

router.get("/", getTranslators);

router.get("/translatorDetails/:translatorId", getTranslatorDetails);

router.get("/reAssignTranslatorsWorks", getReAssignTranslatorWorks);

router.get("/toReAssignWork", getTranslatorToReAssignWork);

router.put("/reAssignWork", reAssignWork);

module.exports = router;
