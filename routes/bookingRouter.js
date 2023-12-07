const router = require("express").Router();
const ctrls = require("../controllers/bookingController");
const {
  verifyAccessToken,
  isAdmin,
  checkPermissionBooking,
} = require("../middlewares/verifyToken");

router.get("/", verifyAccessToken, ctrls.getBookings);
router.post("/patient", verifyAccessToken, ctrls.addBookingByPatient);
router.put("/patient/:id", verifyAccessToken, ctrls.cancelBookingByPatient);
router.put("/patient/payment/:id", verifyAccessToken, ctrls.updatePayment);
router.post("/", verifyAccessToken, ctrls.addBooking);
router.put("/delete-img/:id", verifyAccessToken, ctrls.deleteImageBooking);
router.put(
  "/:id",
  verifyAccessToken,
  checkPermissionBooking,
  ctrls.updateBooking
);
router.delete(
  "/:id",
  verifyAccessToken,
  checkPermissionBooking,
  ctrls.deleteBooking
);

module.exports = router;
