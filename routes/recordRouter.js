const router = require("express").Router();
const ctrls = require("../controllers/recordComtroller");
const {
  verifyAccessToken,
  isAdmin,
  isHost,
} = require("../middlewares/verifyToken");

router.post("/", [verifyAccessToken, isHost], ctrls.createRecord);
router.get("/", ctrls.getRecords);

router.put("/:id", [verifyAccessToken, isHost], ctrls.updateRecord);
router.delete("/:id", [verifyAccessToken, isHost], ctrls.deleteRecord);
router.get("/:id", ctrls.getRecord);

module.exports = router;
