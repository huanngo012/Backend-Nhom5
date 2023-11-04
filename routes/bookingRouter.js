const router = require("express").Router();
const ctrls = require("../controllers/bookingController");
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken");

router.get("/", ctrls.getBookings);
router.get("/patient/", verifyAccessToken, ctrls.getBookingsByPatientID);
router.post("/patient", verifyAccessToken, ctrls.addBookingByPatient);
router.post("/", verifyAccessToken, ctrls.addBooking);
router.put("/:id", ctrls.updateBooking);
router.delete("/:id", ctrls.deleteBooking);

module.exports = router;
