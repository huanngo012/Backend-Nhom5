const router = require("express").Router();
const ctrls = require("../controllers/medicineComtroller");
const {
  verifyAccessToken,
  isAdmin,
  isHost,
} = require("../middlewares/verifyToken");

router.post("/", [verifyAccessToken, isHost], ctrls.createMedicine);
router.get("/", ctrls.getMedicines);

router.put("/:id", [verifyAccessToken, isHost], ctrls.updateMedicine);
router.delete("/:id", [verifyAccessToken, isHost], ctrls.deleteMedicine);
router.get("/:id", ctrls.getMedicine);

module.exports = router;
