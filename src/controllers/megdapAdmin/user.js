const { db, admin } = require("../../../firebase")
const generateToken = require("../../utils/generateToken")

exports.loginMegdapAdmin = async (req, res) => {
    try {
        const { userName, password } = req.body
        
        const userRef = db.collection('users').where('userName', '==', userName)
        
        const userData = await userRef.get()
        if (userData.empty)
            return res.status(401).json({ message: "Invalid Credentials" })
        
        const userDoc = userData.docs[0].data();
        
        if (password !== userDoc.password)
            return res.status(401).json({ message: "Invalid Credentials" })
        
        const user = {
            id: userData.docs[0].id,
            name: userDoc?.userName,
            role: userDoc?.role,
        }
        const token = generateToken(user,'24h')
       
        return res.status(200).json({user,token})
    } catch (error) {
        console.log("Megdap-Admin-Login", error.message)
        return res.status(500).json({message:"Someting went wrong"})
    }
}

exports.getMegdapAdminUser = async (req, res) => {
    try {
        const user = req.user
        if (!user)
            return res.status(401).json({ message: "Unauthorized" })
        return res.status(200).json({user})

    } catch (error) {
        console.log("Megdap-Admin-Get", error.message)
        return res.status(500).json({message:"Someting went wrong"})
    }
}

exports.addUser = async (req, res) => {
    try {
        const { email, firstName, lastName, isAdmin, companyId, companyName } = req.body
        
        const userRef = db.collection('users')
        const userQuery = await userRef.where('email', '==', email).get()
        if (!userQuery.empty)
            return res.status(400).json({ message: "User already exists" })
        
        userRef.add({
            email,
            firstName,
            lastName,
            role: isAdmin ? "admin" : "user",
            companyId,
            companyName,
            status: true,
            totalBilledAmount:0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return res.status(200).json({ message: "User added successfully" })
    } catch (error) {
        console.log('Megdap-Admin-Add-User', error.message)
        return res.status(500).json({message:"Someting went wrong"})
    }
}

exports.logoutMegdapAdmin = async (req, res) => {
    try {
        const token = req.cookies.token
        if(!token)
            return res.status(401).json({ message: "Unauthorized" })
        const { user } = jwt.verify(token, process.env.JWT_SECRET);
        if (!user)
            return res.status(401).json({ message: "Unauthorized" })
        
        const cookieOptions = {
          maxAge: 0,
          httpOnly: true,
        };
        res.cookie("token", "", cookieOptions);
        return res.status(200).json({message:"Logged Out"})
    } catch (error) {
        console.log("Megdap-Admin-Logout", error.message)
        return res.status(500).json({message:"Someting went wrong"})
    }
}