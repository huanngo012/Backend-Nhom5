const { notFound, errHandler } = require("../middlewares/errHandler");
const userRouter = require("./userRouter");
const patientRouter = require("./patientRouter");
const doctorRouter = require("./doctorRouter");
const categoryRouter = require("./categoryRouter");
const clinicRouter = require("./clinicRouter");
const specialtyRouter = require("./specialtyRouter");
const scheduleRouter = require("./scheduleRouter");
const bookingRouter = require("./bookingRouter");

const initRoutes = (app) => {
  app.use("/api/user", userRouter);
  app.use("/api/patient", patientRouter);
  app.use("/api/doctor", doctorRouter);
  app.use("/api/category", categoryRouter);
  app.use("/api/clinic", clinicRouter);
  app.use("/api/specialty", specialtyRouter);
  app.use("/api/schedule", scheduleRouter);
  app.use("/api/booking", bookingRouter);

  app.use(notFound);
  app.use(errHandler);
};

module.exports = initRoutes;
