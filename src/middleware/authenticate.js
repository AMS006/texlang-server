const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    try {
        if (req.headers.authorization) {
        let token = req.headers.authorization;
    
        token = token.split(" ")[1];
    
        const { user } = jwt.verify(token, process.env.JWT_SECRET);
    
        if (!user) return res.status(401).json({ message: "Unauthorized" });
    
        req.user = user;
        next();
        } else {
        console.log("No Auth Header");
        res.status(401).json({ message: "Unauthorized" });
        }
    } catch (error) {
        console.log("Authentication Error", error.message);
        return res.status(500).json({ message: "Unauthorized" });
    }
}

module.exports = authenticate;