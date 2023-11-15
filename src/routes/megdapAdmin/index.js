const express = require('express');

const isMegdapAdmin = require('../../middleware/isMegdapAdmin');

const router = express.Router();

router.use('/user', require('./user'))

router.use('/company',isMegdapAdmin, require('./company'))

router.use('/project', isMegdapAdmin, require('./project'))

router.use('/work', isMegdapAdmin, require('./work'))

router.use('/translator', isMegdapAdmin, require('./translator'))

router.use('/invoice', isMegdapAdmin, require('./invoice'))


module.exports = router