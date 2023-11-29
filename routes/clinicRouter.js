const router = require("express").Router();
const ctrls = require("../controllers/clinicController");
const {
  verifyAccessToken,
  isHost,
  isAdmin,
} = require("../middlewares/verifyToken");

router.get("/", ctrls.getAllClinics);
router.get("/count", ctrls.getCountClinic);
router.get("/:id", ctrls.getClinic);
router.post("/", [verifyAccessToken, isAdmin], ctrls.addClinic);
router.put("/:id", [verifyAccessToken, isAdmin], ctrls.updateClinic);
router.delete("/:id", [verifyAccessToken, isAdmin], ctrls.deleteClinic);
router.put("/host/:id", [verifyAccessToken, isHost], ctrls.updateClinicByHost);
router.put("/rating", [verifyAccessToken], ctrls.ratingsClinic);

module.exports = router;
