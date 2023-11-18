const express = require('express')

const isMegdapAdmin = require('../../middleware/isMegdapAdmin')
const { loginMegdapAdmin, getMegdapAdminUser, addUser } = require('../../controllers/megdapAdmin/user')

const router = express.Router()

router.post('/login', loginMegdapAdmin)

router.get('/', isMegdapAdmin, getMegdapAdminUser)

router.post('/add', isMegdapAdmin, addUser);



module.exports = router