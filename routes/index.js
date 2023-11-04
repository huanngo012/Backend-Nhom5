const { notFound, errHandler } = require("../middlewares/errHandler");
const userRouter = require("./userRouter");
const doctorRouter = require("./doctorRouter");
const clinicRouter = require("./clinicRouter");
const specialtyRouter = require("./specialtyRouter");

const initRoutes = (app) => {
  app.use("/api/user", userRouter);
  app.use("/api/doctor", doctorRouter);
  app.use("/api/clinic", clinicRouter);
  app.use("/api/specialty", specialtyRouter);

  app.use(notFound);
  app.use(errHandler);
};

module.exports = initRoutes;
