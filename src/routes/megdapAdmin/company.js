const { addNewCompany, getAllCompany, getCompanyUsers, setLanguageRate } = require('../../controllers/megdapAdmin/company');

const router = require('express').Router();

router.post('/add', addNewCompany);

router.get('/all', getAllCompany)

router.get('/users/:companyId', getCompanyUsers)

router.put('/setLanguageRate', setLanguageRate)

module.exports = router