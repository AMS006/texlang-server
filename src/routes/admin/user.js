const express = require('express');

const { getAllUser, registerUser, updateUser, changeUserStatus } = require('../../controllers/admin/user');

const router = express.Router();

router.get('/allUsers', getAllUser)

router.post('/registerUser', registerUser)

router.put('/updateUser',updateUser)

router.put('/changeStatus', changeUserStatus)

module.exports = router;