const {
  addNewCompany,
  getAllCompany,
  getCompanyUsers,
  setLanguageRate,
  getCompanyContractDetails,
} = require("../../controllers/megdapAdmin/company");

const router = require("express").Router();

router.post("/add", addNewCompany);

router.get("/all", getAllCompany);

router.get("/users/:companyId", getCompanyUsers);

router.put("/setLanguageRate", setLanguageRate);

router.get("/contractDetails/:companyId", getCompanyContractDetails);

module.exports = router;
