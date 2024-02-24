const router = require("express").Router();
const ctrls = require("../controllers/categoryController");
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken");

router.post("/", [verifyAccessToken, isAdmin], ctrls.createCategory);
router.get("/", ctrls.getCategories);

router.put("/:id", [verifyAccessToken, isAdmin], ctrls.updateCategory);
router.delete("/:id", [verifyAccessToken, isAdmin], ctrls.deleteCategory);
router.get("/:id", ctrls.getCategory);

module.exports = router;
