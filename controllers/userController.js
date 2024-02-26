const User = require("../models/user");
const Doctor = require("../models/doctor");
const moment = require("moment");
const asyncHandler = require("express-async-handler");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const cloudinary = require("../config/cloudinary.config");
const sendMail = require("../utils/sendMail");
const crypto = require("crypto");

const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName)
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ",
    });
  const user = await User.findOne({
    email,
  });
  if (user && user?.emailTokenExpires > Date.now()) {
    throw new Error("Vui lòng xác thực email");
  } else {
    const newUser = user
      ? await User.findByIdAndUpdate(user._id, req.body, { new: true })
      : await User.create(req.body);
    const token = newUser.createEmailToken();
    await newUser.save();
    const html = `Xin vui lòng click vào đây để xác thực email <a href=${process.env.URL_SERVER}/api/user/verify-email/${token}> Click here</a>`;
    const data = {
      email: email,
      subject: "Xác thực email",
      html,
    };
    await sendMail(data);

    return res.status(200).json({
      success: newUser ? true : false,
      message: newUser
        ? "Đăng ký thành công. Vui lòng xác thực qua email !!!"
        : "Đăng ký thất bại",
    });
  }
});

const sendMailVerifyEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new Error("Email không tồn tại");
  const token = user.createEmailToken();
  await user.save();
  const html = `Xin vui lòng click vào đây để xác thực email <a href=${process.env.URL_SERVER}/api/user/verify-email/${token}> Click here</a>`;
  const data = {
    email: email,
    subject: "Xác thực email",
    html,
  };
  const rs = await sendMail(data);
  return res.status(200).json({
    success: true,
    message: "Gửi email xác thực thành công",
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const emailToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    emailToken,
    emailTokenExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.redirect(`${process.env.HOST_URL}/login?state=failed`);
  } else {
    user.emailToken = undefined;
    user.emailTokenExpires = undefined;
    user.isVerified = true;
    await user.save();

    return res.redirect(`${process.env.HOST_URL}/login?state=success`);
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ",
    });
  const response = await User.findOne({ email, isVerified: true });
  if (!response) throw new Error("Email không tồn tại");

  if (response && (await response.isCorrectPassword(password))) {
    const accessToken = generateAccessToken(
      response._id,
      response.role,
      response.email
    );
    // Tạo refresh token
    const newRefreshToken = generateRefreshToken(response._id);
    // Lưu refresh token vào database
    await User.findByIdAndUpdate(
      response._id,
      { refreshToken: newRefreshToken },
      { new: true }
    );
    // Lưu refresh token vào cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: true,
      sameSite: "None",
    });
    res.setHeader("Authorization", `Bearer ${accessToken}`);
    return res.status(200).json({
      success: true,
      accessToken,
      data: {
        _id: response._id,
        fullName: response.fullName,
        email: response.email,
        avatar: response.avatar,
        address: response.address,
        role: response.role,
      },
    });
  } else {
    throw new Error("Tài khoản hoặc mật khẩu không trùng khớp!");
  }
});
const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie || !cookie.refreshToken)
    throw new Error("Không tìm thấy RefreshToken trên cookies");
  // Xóa refresh token ở db
  await User.findOneAndUpdate(
    { refreshToken: cookie.refreshToken },
    { refreshToken: "" },
    { new: true }
  );
  // Xóa refresh token ở cookie trình duyệt
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  return res.status(200).json({
    success: true,
    mes: "Đăng xuất thành công",
  });
});
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Lấy token từ cookies
  const cookie = req.cookies;
  // Check xem có token hay không
  if (!cookie && !cookie.refreshToken)
    throw new Error("Không tìm thấy Refresh token trên cookies");
  // Check token có hợp lệ hay không
  const rs = await jwt.verify(cookie.refreshToken, process.env.JWT_SECRET);
  const response = await User.findOne({
    _id: rs._id,
    refreshToken: cookie.refreshToken,
  });
  if (!response) {
    throw new Error("RefreshToken không trùng khớp");
  }
  const newRefreshToken = generateRefreshToken(response._id);
  response.refreshToken = newRefreshToken;
  await response.save();

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: true,
    sameSite: "None",
  });
  return res.status(200).json({
    success: true,
    accessToken: generateAccessToken(
      response._id,
      response.role,
      response.email
    ),
  });
});

const sendMailResetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new Error("Email không tồn tại");
  const otp = user.createPassworChangedToken();
  await user.save();
  const html = `OTP: ${otp}`;
  const data = {
    email: email,
    subject: "Reset Password",
    html,
  };
  await sendMail(data);
  return res.status(200).json({
    success: true,
    message: "Gửi email xác thực thành công",
  });
});

const verifyResetPassword = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    passwordResetToken: otp,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    throw new Error("Mã xác thực không trùng khớp hoặc hết hạn");
  } else {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    const tokenResetPassword = generateAccessToken(
      user._id,
      user.role,
      user.email
    );
    return res.status(200).json({
      success: true,
      message: "Xác thực thành công",
      tokenResetPassword,
    });
  }
});
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const rs = await jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findOne({
    _id: rs._id,
  });
  if (!user) {
    throw new Error("Yêu cầu đổi mật khẩu hết hạn");
  }
  user.password = password;
  await user.save();
  return res.status(200).json({
    success: true,
    message: "Đổi mật khẩu thành công",
  });
});

const getCurrent = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const response = await User.findById(_id).select(
    "-role -password -isBlocked -refreshToken"
  );
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Không tìm thấy người dùng",
  });
});
const updateUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  if (!_id || Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const user = await User.findById(_id);
  if (!user) throw new Error("Tài khoản không tồn tại");
  const { password, newPassword, avatar } = req.body;
  if (password) {
    const isMatch = await user.isCorrectPassword(password);
    if (!isMatch) throw new Error("Mật khẩu cũ không trùng khớp");
    const salt = bcryptjs.genSaltSync(10);
    req.body.password = await bcryptjs.hash(newPassword, salt);
  }
  if (avatar) {
    const { url } = await cloudinary.uploader.upload(avatar, {
      folder: "booking",
    });
    req.body.avatar = url;
  }
  const response = await User.findByIdAndUpdate(_id, req.body, {
    new: true,
  }).select("-password -role -isBlocked -refreshToken");
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật thông tin người dùng thất bại",
  });
});

//USER
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await User.findById(id).select(
    "-password -role -isBlocked -refreshToken"
  );
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Lấy thông tin người dùng thất bại",
  });
});
const getCountPatient = asyncHandler(async (req, res) => {
  const previousMonth = moment()
    .month(moment().month())
    .set("date", 1)
    .format("YYYY-MM-DD HH:mm:ss");
  const totalCount = await User.find({ role: 4 }).countDocuments();
  const totalNewUser = await User.find({
    createdAt: { $gte: new Date(previousMonth) },
    role: 4,
  }).countDocuments();
  return res.status(200).json({
    success: totalCount ? true : false,
    data: [totalNewUser, totalCount],
  });
});

//ADMIN
const getUsers = asyncHandler(async (req, res) => {
  const queries = { ...req.query };
  const exludeFields = ["limit", "sort", "page", "fields"];
  exludeFields.forEach((el) => delete queries[el]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lt|lte)\b/g,
    (macthedEl) => `$${macthedEl}`
  );
  const formatedQueries = JSON.parse(queryString);
  if (queries?.fullName) {
    formatedQueries.fullName = { $regex: queries.fullName, $options: "i" };
  }
  if (queries?.role) {
    formatedQueries.role = queries.role;
  }
  if (queries?.mobile) {
    formatedQueries.mobile = queries.mobile;
  }

  let queryCommand = User.find(formatedQueries);

  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    queryCommand = queryCommand.sort(sortBy);
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    queryCommand = queryCommand.select(fields);
  }

  const page = +req.query.page || 1;
  const limit = +req.query.limit || process.env.LIMIT;
  const skip = (page - 1) * limit;
  queryCommand.skip(skip).limit(limit);

  const response = await queryCommand.exec();
  const counts = await User.find(formatedQueries).countDocuments();
  if (formatedQueries?.role === "3") {
    let usersWithoutDoctor = [];

    for (const user of response) {
      const doctorInfo = await Doctor.findOne({ _id: user._id }).exec();

      if (!doctorInfo) {
        usersWithoutDoctor.push(user);
      }
    }
    return res.status(200).json({
      success: usersWithoutDoctor.length > 0 ? true : false,
      data:
        usersWithoutDoctor.length > 0
          ? usersWithoutDoctor
          : "Lấy danh sách người dùng thất bại",
      counts,
    });
  }
  return res.status(200).json({
    success: response.length > 0 ? true : false,
    data: response.length > 0 ? response : "Lấy danh sách người dùng thất bại",
    counts,
  });
});
const addUserByAdmin = asyncHandler(async (req, res) => {
  const { fullName, email, password, avatar } = req.body;
  if (!email || !password || !fullName)
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ",
    });
  const newUser = await User.create(req.body);
  const newUserObject = newUser.toObject();
  delete newUserObject.password;
  return res.status(200).json({
    success: newUserObject ? true : false,
    data: newUserObject ? newUserObject : "Thêm người dùng thất bại",
  });
});
const updateUserByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const { role } = req.body;

  if (role && (await User.find({ _id: id, role: 3 }))) {
    await Doctor.findByIdAndDelete(id);
  }

  const response = await User.findByIdAndUpdate(id, req.body, {
    new: true,
  }).select("-password");
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật thông tin người dùng thất bại",
  });
});
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new Error("Vui lòng nhập đầy đủ");
  const user = await User.findById(id);
  if (user?.role === 3) {
    await Doctor.findByIdAndDelete(id);
  }
  const response = await User.findByIdAndDelete(id);
  if (response?.avatar) {
    const urlImage = response?.avatar.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
  }
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Xóa người dùng thất bại",
  });
});

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  getCurrent,
  updateUser,
  getCountPatient,
  getUser,
  getUsers,
  addUserByAdmin,
  updateUserByAdmin,
  deleteUser,
  sendMailVerifyEmail,
  verifyEmail,
  sendMailResetPassword,
  verifyResetPassword,
  resetPassword,
};
