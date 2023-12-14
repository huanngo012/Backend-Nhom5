const router = require("express").Router();
const ctrls = require("../controllers/scheduleController");
const {
  verifyAccessToken,
  isAdminOrHost,
  isDoctor,
  isHost,
} = require("../middlewares/verifyToken");

router.get(
  "/doctor",
  [verifyAccessToken, isDoctor],
  ctrls.getSchedulesOfDoctor
);
router.get("/doctor/:id", [verifyAccessToken], ctrls.getSchedulesByDoctorID);
router.get("/host", [verifyAccessToken, isHost], ctrls.getSchedulesByHost);

router.get("/", ctrls.getSchedules);
router.get("/:id", ctrls.getSchedule);

router.post("/", [verifyAccessToken, isAdminOrHost], ctrls.addSchedule);
router.put("/:id", [verifyAccessToken, isAdminOrHost], ctrls.updateSchedule);
router.delete("/:id", [verifyAccessToken, isAdminOrHost], ctrls.deleteSchedule);

module.exports = router;
