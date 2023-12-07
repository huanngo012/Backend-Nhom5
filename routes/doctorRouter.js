const router = require("express").Router();
const ctrls = require("../controllers/doctorController");
const {
  verifyAccessToken,
  isAdminOrHost,
  checkPermissionDoctor,
} = require("../middlewares/verifyToken");

router.get("/", ctrls.getAllDoctors);
router.get("/count", ctrls.getCountDoctor);
router.get("/:id", ctrls.getDoctor);
router.put("/rating", [verifyAccessToken], ctrls.ratingsDoctor);
router.post(
  "/",
  [verifyAccessToken, isAdminOrHost, checkPermissionDoctor],
  ctrls.addDoctor
);
router.put(
  "/:id",
  [verifyAccessToken, isAdminOrHost, checkPermissionDoctor],
  ctrls.updateDoctor
);
router.delete(
  "/:id",
  [verifyAccessToken, isAdminOrHost, checkPermissionDoctor],
  ctrls.deleteDoctor
);

module.exports = router;
