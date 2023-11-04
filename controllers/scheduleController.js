const Schedule = require("../models/schedule");
const Booking = require("../models/booking");
const Doctor = require("../models/doctor");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;

const getSchedules = asyncHandler(async (req, res) => {
  const queries = { ...req.query };
  const exludeFields = ["limit", "sort", "page", "fields"];
  exludeFields.forEach((el) => delete queries[el]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lt|lte)\b/g,
    (macthedEl) => `$${macthedEl}`
  );
  const formatedQueries = JSON.parse(queryString);

  if (queries?.doctorID) {
    formatedQueries.doctorID = new ObjectID(queries.doctorID);
  }
  if (queries?.date) {
    formatedQueries.date = new Date(queries.date);
  }
  if (queries?.timeType) {
    const timeArr = queries?.timeType.split(",");
    timeArr?.forEach((item, index, array) => {
      array[index] = {
        "timeType.time": item,
      };
    });
    console.log(timeArr);
    formatedQueries.timeType = { $or: timeArr };
  }
  console.log(formatedQueries);
  let queryCommand = Schedule.find(formatedQueries).populate("doctorID");

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
  const counts = await Schedule.find(formatedQueries).countDocuments();
  return res.status(200).json({
    success: response.length > 0 ? true : false,
    data:
      response.length > 0
        ? response
        : "Lấy danh sách lịch khám bệnh của các bác sĩ thất bại",
    counts,
  });
});
const getSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Schedule.findById(id).populate("doctorID");
  return res.status(200).json({
    success: response ? true : false,
    data: response
      ? response
      : "Lấy danh sách lịch khám bệnh của các bác sĩ thất bại",
  });
});
const getSchedulesByDoctorID = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Schedule.find({ doctorID: id });
  return res.status(200).json({
    success: response ? true : false,
    data: response
      ? response
      : "Lấy danh sách lịch khám bệnh của bác sĩ thất bại",
  });
});

const getSchedulesOfDoctor = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const response = await Schedule.find({ doctorID: _id });
  return res.status(200).json({
    success: response ? true : false,
    data: response
      ? response
      : "Lấy danh sách lịch khám bệnh của bác sĩ thất bại",
  });
});

const addSchedule = asyncHandler(async (req, res) => {
  const { doctorID, cost, date, timeType } = req.body;
  if (!doctorID || !cost || !date || !timeType) {
    throw new Error("Vui lòng nhập đầy đủ");
  }
  const alreadyDoctor = await Doctor.findById(doctorID);
  if (!alreadyDoctor) {
    throw new Error("Bác sĩ không tồn tại");
  }
  const newDate = new Date(date);
  newDate.setUTCHours(0, 0, 0, 0);
  newDate.setDate(newDate.getDate() + 1); // Cộng thêm 1 ngày
  const isDuplicateTime = timeType.some(
    (item, index, array) =>
      array.filter((subItem) => subItem.time === item.time).length > 1
  );
  if (isDuplicateTime) {
    throw new Error("Giờ làm việc bị trùng.Vui lòng nhập đúng");
  }
  const alreadySchedule = await Schedule.find({ doctorID, date: newDate });
  if (alreadySchedule.length > 0) {
    throw new Error(
      `Đã tồn tại lịch khám của bác sĩ ngày ${new Date(newDate).getDate()}/${
        new Date(newDate).getMonth() + 1
      }/${new Date(newDate).getUTCFullYear()}`
    );
  } else {
    const response = await Schedule.create({
      doctorID,
      cost,
      date: newDate,
      timeType,
    });
    return res.status(200).json({
      success: response ? true : false,
      data: response ? response : "Thêm lịch khám thất bại",
    });
  }
});
const updateSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  if (req.body.date) {
    const newDate = new Date(req.body.date);
    newDate.setUTCHours(0, 0, 0, 0);
    newDate.setDate(newDate.getDate());
    req.body.date = newDate;
  }
  if (req.body.doctorID && req.body.date) {
    const alreadySchedule = await Schedule.find({
      _id: { $ne: id },
      doctorID: req.body.doctorID,
      date: req.body.date,
    });
    if (alreadySchedule.length > 0) {
      throw new Error(
        `Đã tồn tại lịch khám của bác sĩ ngày ${new Date(
          req.body.date
        ).getDate()}/${new Date(req.body.date).getMonth() + 1}/${new Date(
          req.body.date
        ).getUTCFullYear()}`
      );
    }
  }
  const response = await Schedule.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật lịch khám bệnh thất bại",
  });
});
const deleteSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Schedule.findByIdAndDelete(id);
  await Booking.deleteMany({ scheduleID: id });
  return res.status(200).json({
    success: response ? true : false,
    data: response
      ? `Xóa lịch khám bệnh của bác sĩ thành công`
      : "Xóa lịch khám bệnh của bác sĩ thất bại",
  });
});

module.exports = {
  getSchedules,
  getSchedule,
  getSchedulesByDoctorID,
  getSchedulesOfDoctor,
  addSchedule,
  deleteSchedule,
  updateSchedule,
};
