const Booking = require("../models/booking");
const Schedule = require("../models/schedule");
const User = require("../models/user");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;
const cloudinary = require("../config/cloudinary.config");

const getBookings = asyncHandler(async (req, res) => {
  const { _id, role } = req.user;

  const queries = { ...req.query };
  const exludeFields = ["limit", "sort", "page", "fields"];
  exludeFields.forEach((el) => delete queries[el]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lt|lte)\b/g,
    (macthedEl) => `$${macthedEl}`
  );
  const formatedQueries = JSON.parse(queryString);
  if (queries?.status) {
    formatedQueries.status = { $regex: queries.status, $options: "i" };
  }
  if (role === 4) {
    formatedQueries.patientID = _id;
  }

  const queryCommand = Booking.find(formatedQueries)
    .populate({
      path: "scheduleID",
      populate: {
        path: "doctorID",
        model: "Doctor",
        select: { ratings: 0 },
        populate: [
          {
            path: "clinicID",
            model: "Clinic",
            select: { specialtyID: 0, ratings: 0 },
            match: role === 2 ? { host: new ObjectID(_id) } : {},
          },
          {
            path: "specialtyID",
            model: "Specialty",
          },
          {
            path: "_id",
            model: "User",
            match: role === 3 ? { _id: new ObjectID(_id) } : {},
          },
        ],
      },
    })
    .populate("patientID");
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

  let newResponse = response.filter((el) => el?.scheduleID?.doctorID !== null);
  const counts = newResponse?.length;

  return res.status(200).json({
    success: newResponse.length > 0 ? true : false,
    data:
      newResponse.length > 0
        ? newResponse
        : "Lấy danh sách lịch khám bệnh thất bại",
    counts,
  });
});

const addBookingByPatient = asyncHandler(async (req, res) => {
  const { _id, role } = req.user;
  if (role === 4) {
    const { scheduleID, time, images } = req.body;
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
    const alreadyBooking = await Booking.find({
      patientID: _id,
      time,
    }).populate({
      path: "scheduleID",
      select: "date",
    });
    if (alreadyBooking.length > 0) {
      alreadyBooking?.forEach((el) => {
        if (
          new Date(+alreadySchedule.date).getTime() ===
          new Date(+el?.scheduleID?.date).getTime()
        ) {
          throw new Error("Bạn đã đặt lịch khám thời gian này rồi");
        }
      });
    }
    let urls = [];
    if (images) {
      for (const image of images) {
        const { url } = await cloudinary.uploader.upload(image, {
          folder: "booking",
        });
        urls.push(url);
      }
    }

    const response = await Booking.create({
      patientID: _id,
      scheduleID,
      time,
      images: urls,
    });
    const bookings = await Booking.find({
      scheduleID,
      time,
      status: { $ne: "Đã hủy" },
    });
    if (bookings.length === alreadyTime.maxNumber) {
      await Schedule.updateOne(
        {
          _id: scheduleID,
          timeType: { $elemMatch: alreadyTime },
        },
        {
          $set: {
            "timeType.$.full": true,
          },
        },
        { new: true }
      );
    }
    return res.status(200).json({
      success: response ? true : false,
      message: response ? "Đặt lịch thành công" : "Đặt lịch thất bại",
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }
});

const cancelBookingByPatient = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;
  const booking = await Booking.find({
    _id: id,
    status: "Đang xử lý",
    patientID: _id,
  });
  if (booking) {
    await Booking.findByIdAndUpdate(
      id,
      { status: "Đã hủy" },
      {
        new: true,
      }
    );
    await Schedule.updateOne(
      {
        _id: booking.scheduleID,
        timeType: { $elemMatch: { time: booking.time } },
      },
      {
        $set: {
          "timeType.$.full": false,
        },
      },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: `Hủy lịch khám thành công`,
    });
  }
  return res.status(200).json({
    success: false,
    message: `Không thể hủy lịch khám do bác sĩ đã xác nhận!!!`,
  });
});
const updatePayment = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;
  const booking = await Booking.find({
    _id: id,
    patientID: _id,
  });
  if (booking) {
    await Booking.findByIdAndUpdate(
      id,
      { isPaid: true },
      {
        new: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: `Thanh toán thành công`,
    });
  }
  return res.status(200).json({
    success: false,
    message: `Thanh toán thất bại`,
  });
});

//ADMIN
const addBooking = asyncHandler(async (req, res) => {
  const { scheduleID, time, patientID, images } = req.body;
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
  let urls = [];
  if (images) {
    for (const image of images) {
      const { url } = await cloudinary.uploader.upload(image, {
        folder: "booking",
      });
      urls.push(url);
    }
  }
  const response = await Booking.create({
    patientID,
    scheduleID,
    time,
    images: urls,
  });
  const bookings = await Booking.find({
    scheduleID,
    time,
    status: { $ne: "Đã hủy" },
  });
  if (bookings.length === alreadyTime.maxNumber) {
    await Schedule.updateOne(
      {
        _id: scheduleID,
        timeType: { $elemMatch: alreadyTime },
      },
      {
        $set: {
          "timeType.$.full": true,
        },
      },
      { new: true }
    );
  }
  return res.status(200).json({
    success: response ? true : false,
    message: response ? "Đặt lịch thành công" : "Đặt lịch thất bại",
  });
});
const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Booking.findByIdAndUpdate(
    id,
    {
      status: req.body.status,
      description: req?.body?.description,
      isPaid: req?.body?.isPaid,
    },
    {
      new: true,
    }
  );
  return res.status(200).json({
    success: response ? true : false,
    message: response
      ? "Cập nhật trạng thái lịch khám thành công"
      : "Cập nhật trạng thái lịch khám thất bại",
  });
});

const deleteBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Booking.findByIdAndDelete(id);

  for (const image of response?.images) {
    const urlImage = image.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
  }
  return res.status(200).json({
    success: response ? true : false,
    message: response ? `Xóa thành công` : "Xóa thất bại",
  });
});
const deleteImageBooking = asyncHandler(async (req, res) => {
  const { images } = req.body;
  const { id } = req.params;
  for (const image of images) {
    const urlImage = image.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(imgName);
  }
  const updatedBooking = await Booking.findById(id);
  const imagesNew = updatedBooking?.images?.filter(
    (el1) => !images?.some((el2) => el1 === el2)
  );
  updatedBooking.images = imagesNew;
  await updatedBooking.save();
  return res.status(200).json({
    success: true,
    data: `Xóa ảnh thành công`,
  });
});

module.exports = {
  getBookings,
  addBookingByPatient,
  cancelBookingByPatient,
  updateBooking,
  deleteBooking,
  addBooking,
  deleteImageBooking,
  updatePayment,
};
