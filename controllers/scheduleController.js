const Schedule = require("../models/schedule");
const Booking = require("../models/booking");
const Doctor = require("../models/doctor");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;
const convertStringToRegexp = require("../utils/helper");

const getSchedules = asyncHandler(async (req, res) => {
  let nameSpecialty;
  let nameClinic;
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

  if (queries?.nameSpecialty) {
    nameSpecialty = queries?.nameSpecialty;
    delete formatedQueries?.nameSpecialty;
  }

  if (queries?.nameClinic) {
    nameClinic = queries?.nameClinic;
    delete formatedQueries?.nameClinic;
  }

  if (queries?.startDate && queries?.endDate) {
    const start = new Date(+queries?.startDate);
    const end = new Date(+queries?.endDate);
    formatedQueries.date = {
      $gte: start,
      $lte: end,
    };
    delete formatedQueries?.startDate;
    delete formatedQueries?.endDate;
  }
  if (queries?.date) {
    const newDate = new Date(+queries.date);
    newDate.setHours(7, 0, 0, 0);
    newDate.setDate(newDate.getDate());
    formatedQueries.date = new Date(newDate);
  }
  if (queries?.timeType) {
    const timeArr = queries?.timeType.split(",");
    timeArr?.forEach((item, index, array) => {
      array[index] = {
        "timeType.time": item,
      };
    });
    formatedQueries.timeType = { $or: timeArr };
  }
  const fields = req?.query?.fields?.split(",").join(" ");

  let queryCommand = Schedule.find(formatedQueries).populate({
    path: "doctorID",
    model: "Doctor",
    select: `${fields ? fields : ""}`,
    populate: [
      {
        path: "_id",
        model: "User",
        select: { __v: 0, password: 0, createdAt: 0, updatedAt: 0, role: 0 },
      },
      {
        path: "specialtyID",
        model: "Specialty",
        match: nameSpecialty
          ? {
              name: {
                $regex: convertStringToRegexp(nameSpecialty.trim()),
              },
            }
          : {},
      },
      {
        path: "clinicID",
        model: "Clinic",
        match: nameClinic
          ? {
              name: {
                $regex: convertStringToRegexp(nameClinic.trim()),
              },
            }
          : {},
        select: {
          specialtyID: 0,
          address: 0,
          image: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        },
      },
    ],
  });

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

  let response = await queryCommand.exec();
  const counts = await Schedule.find(formatedQueries).countDocuments();
  let newResponse = response.filter(
    (el) =>
      el?.doctorID?.specialtyID !== null && el?.doctorID?.clinicID !== null
  );

  return res.status(200).json({
    success: newResponse.length > 0 ? true : false,
    data: newResponse,
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

const getSchedulesByHost = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  let nameSpecialty;
  let nameClinic;
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

  if (queries?.nameSpecialty) {
    nameSpecialty = queries?.nameSpecialty;
    delete formatedQueries?.nameSpecialty;
  }

  if (queries?.nameClinic) {
    nameClinic = queries?.nameClinic;
    delete formatedQueries?.nameClinic;
  }

  if (queries?.startDate && queries?.endDate) {
    const start = new Date(+queries?.startDate);
    const end = new Date(+queries?.endDate);
    formatedQueries.date = {
      $gte: start,
      $lte: end,
    };
    delete formatedQueries?.startDate;
    delete formatedQueries?.endDate;
  }
  if (queries?.date) {
    const newDate = new Date(+queries.date);
    newDate.setHours(7, 0, 0, 0);
    newDate.setDate(newDate.getDate());
    formatedQueries.date = new Date(newDate);
  }
  if (queries?.timeType) {
    const timeArr = queries?.timeType.split(",");
    timeArr?.forEach((item, index, array) => {
      array[index] = {
        "timeType.time": item,
      };
    });
    formatedQueries.timeType = { $or: timeArr };
  }

  let queryCommand = Schedule.find(formatedQueries).populate({
    path: "doctorID",
    model: "Doctor",
    populate: [
      {
        path: "_id",
        model: "User",
        select: { __v: 0, password: 0, createdAt: 0, updatedAt: 0, role: 0 },
      },
      {
        path: "specialtyID",
        model: "Specialty",
        match: nameSpecialty
          ? { name: { $regex: nameSpecialty, $options: "i" } }
          : {},
      },
      {
        path: "clinicID",
        model: "Clinic",
        match: nameClinic
          ? {
              name: { $regex: nameClinic, $options: "i" },
              host: new ObjectID(_id),
            }
          : {
              host: new ObjectID(_id),
            },
        select: {
          specialtyID: 0,
          address: 0,
          image: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        },
      },
    ],
  });

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

  let response = await queryCommand.exec();

  let newResponse = response.filter(
    (el) =>
      el?.doctorID?.specialtyID !== null && el?.doctorID?.clinicID !== null
  );

  const schedules = await Schedule.find(formatedQueries).populate({
    path: "doctorID",
    model: "Doctor",
    populate: [
      {
        path: "clinicID",
        model: "Clinic",
        match: { host: new ObjectID(_id) },
      },
    ],
  });
  let counts = schedules.filter(
    (el) =>
      el?.doctorID?.specialtyID !== null && el?.doctorID?.clinicID !== null
  ).length;
  return res.status(200).json({
    success: newResponse.length > 0 ? true : false,
    data:
      newResponse.length > 0
        ? newResponse
        : "Lấy danh sách lịch khám bệnh của các bác sĩ thất bại",
    counts,
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
  const newDate = new Date(+date);
  newDate.setHours(7, 0, 0, 0);
  newDate.setDate(newDate.getDate());
  const isDuplicateTime = timeType.some(
    (item, index, array) =>
      array.filter((subItem) => subItem.time === item.time).length > 1
  );
  if (isDuplicateTime) {
    throw new Error("Giờ làm việc bị trùng. Vui lòng nhập đúng");
  }
  const alreadySchedule = await Schedule.find({ doctorID, date: newDate });
  if (alreadySchedule.length > 0) {
    throw new Error(
      `Đã tồn tại lịch khám của bác sĩ ngày ${new Date(newDate).getDate()}/${
        new Date(newDate).getMonth() + 1
      }/${new Date(newDate).getFullYear()}`
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
      message: response
        ? "Thêm lịch khám thành công"
        : "Thêm lịch khám thất bại",
    });
  }
});
const updateSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { doctorID } = req.body;
  if (!doctorID) throw new Error("Vui lòng nhập ID bác sĩ");
  if (req.body.date) {
    const newDate = new Date(+req.body.date);
    newDate.setHours(7, 0, 0, 0);
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
        ).getFullYear()}`
      );
    }
  }
  const response = await Schedule.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    message: response
      ? "Cập nhật lịch khám bệnh thành công"
      : "Cập nhật lịch khám bệnh thất bại",
  });
});
const deleteSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Schedule.findByIdAndDelete(id);
  await Booking.deleteMany({ scheduleID: id });
  return res.status(200).json({
    success: response ? true : false,
    message: response
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
  getSchedulesByHost,
};
