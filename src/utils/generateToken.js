const jwt = require('jsonwebtoken')

const generateToken = (user,expiresIn = "2d") =>{
    return jwt.sign({user},process.env.JWT_SECRET,{expiresIn})
}

module.exports = generateToken