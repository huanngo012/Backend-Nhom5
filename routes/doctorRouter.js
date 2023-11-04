const router = require("express").Router();
const ctrls = require("../controllers/doctorController");
const {
  verifyAccessToken,
  isAdminOrHost,
} = require("../middlewares/verifyToken");

router.get("/", ctrls.getAllDoctors);
router.get("/count", ctrls.getCountDoctor);
router.get("/:id", ctrls.getDoctor);
router.post("/", [verifyAccessToken, isAdminOrHost], ctrls.addDoctor);
router.put("/:id", [verifyAccessToken, isAdminOrHost], ctrls.updateDoctor);
router.delete("/:id", [verifyAccessToken, isAdminOrHost], ctrls.deleteDoctor);

module.exports = router;
