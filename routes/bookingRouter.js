const router = require("express").Router();
const ctrls = require("../controllers/bookingController");
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken");

router.get("/", ctrls.getBookings);
router.get("/patient/", verifyAccessToken, ctrls.getBookingsByPatientID);
router.post("/patient", verifyAccessToken, ctrls.addBookingByPatient);
router.put("/patient/:id", verifyAccessToken, ctrls.cancelBookingByPatient);
router.post("/", verifyAccessToken, ctrls.addBooking);
router.put("/:id", verifyAccessToken, ctrls.updateBooking);
router.delete("/:id", verifyAccessToken, ctrls.deleteBooking);

module.exports = router;
