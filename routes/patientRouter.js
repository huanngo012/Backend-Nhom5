const router = require("express").Router();
const ctrls = require("../controllers/patientController");
const { verifyAccessToken } = require("../middlewares/verifyToken");

router.get("/", [verifyAccessToken], ctrls.getPatients);
// router.get("/count", ctrls.getCountSpecialty);
// router.get("/:id", ctrls.getSpecialty);
router.post("/", [verifyAccessToken], ctrls.addPatient);
router.put("/:id", [verifyAccessToken], ctrls.updatePatient);
router.delete("/:id", [verifyAccessToken], ctrls.deletePatient);

module.exports = router;
