const router = require("express").Router();
const ctrls = require("../controllers/userController");
const {
  verifyAccessToken,
  isAdmin,
  isAdminOrHost,
} = require("../middlewares/verifyToken");

router.post("/register", ctrls.register);
router.post("/login", ctrls.login);
router.post("/logout", ctrls.logout);

router.get("/current", [verifyAccessToken], ctrls.getCurrent);
router.put("/current", [verifyAccessToken], ctrls.updateUser);
router.post("/refreshtoken", ctrls.refreshAccessToken);

router.get("/count-patient", ctrls.getCountPatient);

//ADMIN
//CRUD
router.get("/", [verifyAccessToken, isAdminOrHost], ctrls.getUsers);
router.post("/", [verifyAccessToken, isAdmin], ctrls.addUserByAdmin);
router.get("/:id", ctrls.getUser);
router.put("/:id", [verifyAccessToken, isAdmin], ctrls.updateUserByAdmin);
router.delete("/:id", [verifyAccessToken, isAdmin], ctrls.deleteUser);

module.exports = router;
