const router = require("express").Router();
const ctrls = require("../controllers/specialtyController");
const {
  verifyAccessToken,
  isAdminOrHost,
  isAdmin,
} = require("../middlewares/verifyToken");

router.get("/", ctrls.getAllSpecialtys);
router.get("/count", ctrls.getCountSpecialty);
router.get("/:id", ctrls.getSpecialty);
router.post("/", [verifyAccessToken, isAdmin], ctrls.addSpecialty);
router.put("/:id", [verifyAccessToken, isAdmin], ctrls.updateSpecialty);
router.delete("/:id", [verifyAccessToken, isAdmin], ctrls.deleteSpecialty);

module.exports = router;
