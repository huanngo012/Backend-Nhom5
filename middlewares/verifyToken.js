const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const verifyAccessToken = asyncHandler(async (req, res, next) => {
  // Bearer token
  // headers: { authorization: Bearer token}
  if (req?.headers?.authorization?.startsWith("Bearer")) {
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err)
        return res.status(401).json({
          success: false,
          mes: "Token hết hạn",
        });
      req.user = decode;
      next();
    });
  } else {
    return res.status(401).json({
      success: false,
      mes: "Xác thực thất bại!!!",
    });
  }
});
const isAdmin = asyncHandler((req, res, next) => {
  const { role } = req.user;
  if (role !== 1)
    //admin
    return res.status(401).json({
      success: false,
      mes: "Bạn không có quyền!!!",
    });
  next();
});
const isHost = asyncHandler((req, res, next) => {
  const { role } = req.user;
  if (role !== 2)
    //admin
    return res.status(401).json({
      success: false,
      mes: "Bạn không có quyền!!!",
    });
  next();
});
const isAdminOrHost = asyncHandler((req, res, next) => {
  const { role } = req.user;
  if (role !== 2 && role !== 1)
    //host
    return res.status(401).json({
      success: false,
      mes: "Bạn không có quyền!!!",
    });
  next();
});
const isDoctor = asyncHandler((req, res, next) => {
  const { role } = req.user;
  if (role !== 3)
    //doctoc
    return res.status(401).json({
      success: false,
      mes: " Bạn không có quyền!!!",
    });
  next();
});

module.exports = {
  verifyAccessToken,
  isAdmin,
  isHost,
  isDoctor,
  isAdminOrHost,
};
