const jwt = require("jsonwebtoken");

const isMegdapAdmin = (req, res, next) => {
  try {
    if (req.headers.authorization) {
      let token = req.headers.authorization;

      token = token.split(" ")[1];

      const { user } = jwt.verify(token, process.env.JWT_SECRET);

      if (!user) return res.status(401).json({ message: "Unauthorized" });

      if (user.role !== "megdapAdmin")
        return res.status(401).json({ message: "Unauthorized" });

      req.user = user;
      next();
    } else {
      console.log("No Auth Header");
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.log("Megdap-Admin-Auth", error.message);
    return res.status(500).json({ message: "Unauthorized" });
  }
};

module.exports = isMegdapAdmin;
