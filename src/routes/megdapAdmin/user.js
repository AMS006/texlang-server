const express = require('express')

const isMegdapAdmin = require('../../middleware/isMegdapAdmin')
const { loginMegdapAdmin, logoutMegdapAdmin, getMegdapAdminUser, addUser, getCompanyUsers } = require('../../controllers/megdapAdmin/user')

const router = express.Router()

router.post('/login', loginMegdapAdmin)

router.get('/', isMegdapAdmin, getMegdapAdminUser)

router.post('/add', isMegdapAdmin, addUser);

router.get('/logout',isMegdapAdmin, logoutMegdapAdmin)


module.exports = router