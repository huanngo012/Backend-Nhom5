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

//database
dbConnect();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL, // Client URL
  "192.168.1.67:3000", // Client URL MOBILE
  process.env.ADMIN_URL, // Admin URL
  process.env.HOST_URL,
  process.env.ADMIN_URL_HOST,
  "http://localhost:3001",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["POST", "PUT", "GET", "DELETE"],
    credentials: true,
    cookie: {
      domain: "localhost",
    },
  })
);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
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

//routes
initRoutes(app);

app.listen(port, () => {
  console.log("Server running on the port: " + port);
});
