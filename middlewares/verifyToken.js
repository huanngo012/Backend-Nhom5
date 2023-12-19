const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;
const Booking = require("../models/booking");
const Doctor = require("../models/doctor");
const User = require("../models/user");
const Clinic = require("../models/clinic");
const Specialty = require("../models/specialty");
const Schedule = require("../models/schedule");

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
    //host
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
      mes: "Bạn không có quyền!!!",
    });
  next();
});

const checkPermissionDoctor = asyncHandler(async (req, res, next) => {
  const { role, _id } = req.user;
  const { clinicID } = req.body;
  const { id } = req.params;
  if (role === 3) {
    if (clinicID) {
      const isHost = await Clinic.find({ _id: clinicID, host: _id });
      if (!isHost) {
        return res.status(401).json({
          success: false,
          mes: "Bạn không có quyền!!!",
        });
      }
    } else {
      const doctor = await Doctor.findById(id).populate("clinicID");
      if (doctor?.clinicID?.host?.toString() !== _id.toString()) {
        return res.status(401).json({
          success: false,
          mes: "Bạn không có quyền!!!",
        });
      }
    }
  }

  next();
});
const checkPermissionBooking = asyncHandler(async (req, res, next) => {
  const { role, _id } = req.user;
  const { id } = req.params;
  const booking = await Booking.findById(id).populate({
    path: "scheduleID",
    populate: {
      path: "doctorID",
      model: "Doctor",
      select: "clinicID  _id",
      populate: [
        {
          path: "clinicID",
          model: "Clinic",
          select: " host",
        },
      ],
    },
  });
  if (
    (role === 3 &&
      _id.toString() !== booking?.scheduleID?.doctorID?._id?.toString()) ||
    (role === 2 &&
      _id.toString() !==
        booking?.scheduleID?.doctorID?.clinicID?.host?.toString())
  ) {
    return res.status(401).json({
      success: false,
      mes: "Bạn không có quyền!!!",
    });
  }

  next();
});

module.exports = {
  verifyAccessToken,
  isAdmin,
  isHost,
  isDoctor,
  isAdminOrHost,
  checkPermissionBooking,
  checkPermissionDoctor,
};
