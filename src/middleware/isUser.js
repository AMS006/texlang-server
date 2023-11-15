const jwt = require('jsonwebtoken');
const { db } = require('../../firebase');

const isUser = async (req, res, next) => {
    try {
        if (req.headers.authorization) {
            let token = req.headers.authorization
            token = token.split(" ")[1];
            if (!token)
                return res.status(401).json({ message: "Unauthorized" })

            let { user } = jwt.verify(token, process.env.JWT_SECRET);
            if (!user)
                return res.status(401).json({ message: "Unauthorized" })

            const userRef = db.collection('users')
            const userQuery = await userRef.doc(user.id).get()

            const userData = userQuery.data()
            if (!userData || !userData?.status) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            
            req.user = {
                id: userQuery.id,
                name: userData?.firstName + " " + userData?.lastName,
                email: userData?.email,
                role: userData?.role,
                companyId: user?.companyId,
                companyName: user?.companyName
            };
            next();
        }
        else {
            return res.status(401).json({ message: "Unauthorized" });
        }
    } catch (error) {
        console.log("User-Middleware:", error.message);
        res.status(401).json({ message: "Something went wrong" });
    }
};

module.exports = isUser;