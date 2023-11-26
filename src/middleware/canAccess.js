const canAccess = (roles) => {
    return (req, res, next) => {
        const user = req.user;
        if(!user) return res.status(401).json({ message: "Unauthorized" });

        if(!roles.includes(user.role)) return res.status(401).json({ message: "Unauthorized" });

        next();
    }
}

module.exports = canAccess;