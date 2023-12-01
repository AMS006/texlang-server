const cors = require("cors");
const express = require("express");

const userRouter = require("./src/routes/user");
const workRouter = require("./src/routes/work");
const adminRouter = require("./src/routes/admin");
const projectRouter = require("./src/routes/project");
const megdapAdminRouter = require("./src/routes/megdapAdmin");
const companyAdminRouter = require("./src/routes/companyAdmin");

const authenticate = require("./src/middleware/authenticate");
const canAccess = require("./src/middleware/canAccess");
const { Roles } = require("./src/constants");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

const whitelist = [
  "https://texlang-client-qjvrxcjtna-uc.a.run.app",
  "https://texlang-admin-client-qjvrxcjtna-uc.a.run.app",
  "http://localhost:5174",
  "http://localhost:5173",
];


const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/user", userRouter);
app.use("/api/project", projectRouter);
app.use("/api/work", workRouter);
app.use("/api/admin", authenticate,canAccess([Roles.ADMIN]), adminRouter);
app.use("/api/megdapadmin", megdapAdminRouter);
app.use("/api/companyAdmin", authenticate,canAccess([Roles.COMPANY_ADMIN]), companyAdminRouter);

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
