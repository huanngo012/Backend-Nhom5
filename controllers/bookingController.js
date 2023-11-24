const Booking = require("../models/booking");
const Schedule = require("../models/schedule");
const User = require("../models/user");
const asyncHandler = require("express-async-handler");

const getBookings = asyncHandler(async (req, res) => {
  const response = await Booking.find()
    .populate({
      path: "scheduleID",
      select: "doctorID date cost",
    })
    .populate({ path: "patientID", select: "fullName mobile avatar" });
  return res.status(200).json({
    success: response ? true : false,
    data: response
      ? response
      : "Lấy danh sách lịch khám bệnh của bệnh nhân thất bại",
  });
});

const getBookingsByPatientID = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const response = await Booking.find({ patientID: _id }).populate({
    path: "scheduleID",
    populate: {
      path: "doctorID",
      model: "Doctor",
      populate: [
        {
          path: "clinicID",
          model: "Clinic",
          select: { specialtyID: 0 },
        },
        {
          path: "specialtyID",
          model: "Specialty",
        },
        {
          path: "_id",
          model: "User",
        },
      ],
    },
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response
      ? response
      : "Lấy danh sách lịch khám bệnh của bác sĩ thành công",
  });
});
const addBookingByPatient = asyncHandler(async (req, res) => {
  const { _id, role } = req.user;
  if (role === 4) {
    const { scheduleID, time } = req.body;
    if (!scheduleID || !time) throw new Error("Vui lòng nhập đầy đủ");
    const alreadySchedule = await Schedule.findById(scheduleID);
    if (!alreadySchedule) {
      throw new Error("Lịch khám bệnh không tồn tại");
    }
    const alreadyTime = alreadySchedule.timeType.find(
      (el) => el.time === time && el.full !== true
    );
    if (!alreadyTime) {
      throw new Error(
        "Thời gian khám bệnh trong ngày không tồn tại hoặc đã kín lịch"
      );
    }
    const bookings = Booking.find({
      scheduleID,
      time,
      status: { $ne: "Đã hủy" },
    });
    if (bookings.length >= alreadyTime.maxNumber) {
      throw new Error("Đã kín giờ khám này");
    }
    const response = await Booking.create({
      patientID: _id,
      scheduleID,
      time,
    });
    return res.status(200).json({
      success: response ? true : false,
      data: response ? response : "Đặt lịch thất bại",
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }
});

const cancelBookingByPatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.find({ _id: id, status: "Đang xử lý" });
  if (booking) {
    await Booking.findByIdAndUpdate(
      id,
      { status: "Đã hủy" },
      {
        new: true,
      }
    );
    return res.status(200).json({
      success: true,
      message: `Hủy lịch khám thành công`,
    });
  }
  return res.status(200).json({
    success: false,
    message: `Không thể hủy lịch khám do bác sĩ đã xác nhận!!! Vui lòng liên hệ lại với bác sĩ`,
  });
});

//ADMIN
const addBooking = asyncHandler(async (req, res) => {
  const { scheduleID, time, patientID } = req.body;
  if (!scheduleID || !time || !patientID)
    throw new Error("Vui lòng nhập đầy đủ");
  const alreadyUser = await User.findById(patientID);
  if (!alreadyUser) {
    throw new Error("Người dùng không tồn tại");
  }
  const alreadySchedule = await Schedule.findById(scheduleID);
  if (!alreadySchedule) {
    throw new Error("Lịch khám bệnh không tồn tại");
  }
  const alreadyTime = alreadySchedule.timeType.find(
    (el) => el.time === time && el.full !== true
  );
  if (!alreadyTime) {
    throw new Error(
      "Thời gian khám bệnh trong ngày không tồn tại hoặc đã kín lịch"
    );
  }
  const bookings = Booking.find({
    scheduleID,
    time,
    status: { $ne: "Đã hủy" },
  });
  if (bookings.length >= alreadyTime.maxNumber) {
    throw new Error("Đã kín giờ khám này");
  }
  const response = await Booking.create({
    patientID,
    scheduleID,
    time,
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Đặt lịch thất bại",
  });
});
const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!req.body.status) throw new Error("Vui lòng nhập đầy đủ");
  const response = await Booking.findByIdAndUpdate(
    id,
    { status: req.body.status, description: req?.body?.description },
    {
      new: true,
    }
  );
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật trạng thái lịch khám thất bại",
  });
});

const deleteBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Booking.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? `Xóa thành công` : "Xóa thất bại",
  });
});

module.exports = {
  getBookings,
  getBookingsByPatientID,
  addBookingByPatient,
  cancelBookingByPatient,
  updateBooking,
  deleteBooking,
  addBooking,
};
