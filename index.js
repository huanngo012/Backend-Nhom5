const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
//
const dbConnect = require("./config/dbconnect");
const initRoutes = require("./routes");
const moment = require("moment-timezone");
moment.tz.setDefault("Asia/Ho_Chi_Minh");

//swagger
const CSS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css";
const swaggerUi = require("swagger-ui-express");

const port = process.env.PORT || 8888;

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["POST", "PUT", "GET", "DELETE"],
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is running...");
});

const swaggerDoc = require("./swagger.json");
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDoc, { customCssUrl: CSS_URL })
);

//image

app.use(bodyParser.json({ limit: "500mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "500mb",
    extended: true,
    parameterLimit: 50000,
  })
);

//database
dbConnect();

//routes
initRoutes(app);

app.listen(port, () => {
  console.log("Server running on the port: " + port);
});
