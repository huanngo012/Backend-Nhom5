const { notFound, errHandler } = require("../middlewares/errHandler");
const userRouter = require("./userRouter");
const doctorRouter = require("./doctorRouter");

const initRoutes = (app) => {
  app.use("/api/user", userRouter);
  app.use("/api/doctor", doctorRouter);

  app.use(notFound);
  app.use(errHandler);
};

module.exports = initRoutes;
