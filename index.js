const cors = require("cors");
const express = require("express");

const userRouter = require("./src/routes/user");
const workRouter = require("./src/routes/work");
const adminRouter = require("./src/routes/admin");
const projectRouter = require("./src/routes/project");
const megdapAdminRouter = require("./src/routes/megdapAdmin");

const isAdmin = require("./src/middleware/isAdmin");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

const whitelist = [
  "https://texlang-client-qjvrxcjtna-uc.a.run.app",
  "http://localhost:5174",
  "http://localhost:5173",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/user", userRouter);
app.use("/api/project", projectRouter);
app.use("/api/work", workRouter);
app.use("/api/admin", isAdmin, adminRouter);
app.use("/api/megdapadmin", megdapAdminRouter);

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
