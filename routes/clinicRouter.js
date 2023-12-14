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
router.put("/rating", [verifyAccessToken], ctrls.ratingsClinic);
router.put(
  "/specialtys-add/:id",
  [verifyAccessToken],
  ctrls.addSpecialtyClinic
);
router.put(
  "/specialtys-delete/:id",
  [verifyAccessToken],
  ctrls.deleteSpecialtyClinic
);
router.put("/rating", [verifyAccessToken], ctrls.ratingsClinic);
router.post("/", [verifyAccessToken, isAdmin], ctrls.addClinic);
router.put("/:id", [verifyAccessToken, isAdmin], ctrls.updateClinic);
router.delete("/:id", [verifyAccessToken, isAdmin], ctrls.deleteClinic);

module.exports = router;
