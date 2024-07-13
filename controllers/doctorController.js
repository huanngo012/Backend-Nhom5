const moment = require("moment-timezone");
const Doctor = require("../models/doctor");
const User = require("../models/user");
const Clinic = require("../models/clinic");
const Specialty = require("../models/specialty");
const Schedule = require("../models/schedule");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;
const convertStringToRegexp = require("../utils/helper");

const getAllDoctors = asyncHandler(async (req, res) => {
  const queries = { ...req.query };
  const exludeFields = ["limit", "sort", "page", "fields"];
  exludeFields.forEach((el) => delete queries[el]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lt|lte)\b/g,
    (macthedEl) => `$${macthedEl}`
  );
  const formatedQueries = JSON.parse(queryString);
  Object.keys(formatedQueries).forEach((key) => {
    if (!formatedQueries[key]) {
      delete formatedQueries[key];
    }
  });
  //Tìm theo ID Host
  if (queries.host) {
    formatedQueries["clinicID.host"] = new ObjectID(queries.host);
    delete formatedQueries?.host;
  }

  //Tìm theo tên chuyên khoa
  if (queries?.nameSpecialty) {
    formatedQueries["specialtyID.name"] = {
      $regex: convertStringToRegexp(queries.nameSpecialty.trim()),
    };
    delete formatedQueries?.nameSpecialty;
  }
  //Tìm theo tên bệnh viện
  if (queries?.nameClinic) {
    formatedQueries["clinicID.name"] = {
      $regex: convertStringToRegexp(queries.nameClinic.trim()),
    };
    delete formatedQueries?.nameClinic;
  }

  //Tìm theo tên bác sĩ
  if (queries?.fullName) {
    formatedQueries["_id.fullName"] = {
      $regex: convertStringToRegexp(queries.fullName.trim()),
    };
    delete formatedQueries?.fullName;
  }

  let queryCommand = Doctor.find(formatedQueries)
    .populate({
      path: "_id",
    })
    .populate("specialtyID")
    .populate({
      path: "clinicID",
      select: "name address logo",
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

  const response = await queryCommand.select("-ratings").exec();

  const counts = (await Doctor.find(formatedQueries)).length;

  // Get Days
  let currentDate = moment();
  let startDate = currentDate.clone().startOf("isoweek").toDate();
  let endDate = currentDate.clone().endOf("isoweek").toDate();
  const newResponse = [];

  for (const doctor of response) {
    const schedules = await Schedule.find({
      doctorID: doctor?._id?._id,
      date: { $gte: startDate, $lte: endDate },
    });

    if (schedules) {
      const days = schedules.map((schedule) => {
        const day = schedule.date.getDay();
        return day;
      });

      const { _doc } = doctor;
      newResponse.push({
        ..._doc,
        ...{ schedules: days },
      });
    }
  }

  return res.status(200).json({
    success: newResponse.length > 0 ? true : false,
    data: newResponse,
    counts,
  });
});
const getDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Doctor.findById(id)
    .populate("_id")
    .populate("specialtyID")
    .populate({
      path: "clinicID",
      select: "name address description image",
    })
    .populate({
      path: "ratings",
      populate: {
        path: "postedBy",
        select: "fullName avatar",
      },
    });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Bác sĩ không được tìm thấy",
  });
});

const getCountDoctor = asyncHandler(async (req, res) => {
  const previousMonth = moment()
    .month(moment().month())
    .set("date", 1)
    .format("YYYY-MM-DD HH:mm:ss");

  const totalCount = await Doctor.find().countDocuments();
  const totalNewDoctor = await Doctor.find({
    createdAt: { $gte: new Date(previousMonth) },
  }).countDocuments();
  return res.status(200).json({
    success: totalCount ? true : false,
    data: [totalNewDoctor, totalCount],
  });
});

const addDoctor = asyncHandler(async (req, res) => {
  const {
    id,
    gender,
    clinicID,
    specialtyID,
    description,
    roomID,
    position,
    avatar,
  } = req.body;

  const user = await User.findById(id);
  const alreadyDotor = await Doctor.findById(id);
  if (user?.role !== 3 || !user || alreadyDotor)
    throw new Error(
      "Người dùng này không có quyền bác sĩ hoặc đã tồn tại thông tin bác sĩ này. Không thể thêm mới!!!"
    );

  if (!roomID || !specialtyID || !clinicID || !gender)
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ",
    });
  const alreadySpecialty = await Specialty.findById(specialtyID);
  const alreadyClinic = await Clinic.findById(clinicID);
  if (alreadySpecialty && alreadyClinic) {
    const specialty = alreadyClinic?.specialtyID.find(
      (el) => el.toString() === specialtyID
    );
    if (!specialty) throw new Error("Bệnh viện không tồn tại chuyên khoa này");
    const response = await Doctor.create({
      _id: id,
      ...req.body,
    });
    if (response && avatar) {
      await User.findByIdAndUpdate(id, { avatar });
    }
    return res.status(200).json({
      success: response ? true : false,
      data: response ? response : "Thêm thông tin bác sĩ thất bại",
    });
  }
  return res.status(200).json({
    success: false,
    data: "Bệnh viện hoặc Chuyên khoa không tồn tại",
  });
});
const updateDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { specialtyID, clinicID, avatar } = req.body;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const doctor = await Doctor.findById(id).populate("clinicID");
  if (specialtyID) {
    if (clinicID) {
      const clinic = await Clinic.findById(clinicID);
      const alreadySpecialty = clinic?.specialtyID?.find(
        (el) => el.toString() === specialtyID
      );
      if (!alreadySpecialty) {
        throw new Error("Bệnh viện không tồn tại chuyên khoa này");
      }
    } else {
      const specialty = doctor?.clinicID?.specialtyID?.find(
        (el) => el.toString() === specialtyID
      );
      if (!specialty) {
        throw new Error("Bệnh viện không tồn tại chuyên khoa này");
      }
    }
  }

  const response = await Doctor.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (response && avatar) {
    await User.findByIdAndUpdate(id, { avatar });
  }
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật thông tin bác sĩ thất bại",
  });
});
const deleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Doctor.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Xóa thất bại",
  });
});

const ratingsDoctor = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { star, comment, doctorID, updatedAt } = req.body;
  if (!star || !doctorID) {
    throw new Error("Vui lòng nhập đầy đủ");
  }
  const ratingDoctor = await Doctor.findById(doctorID);
  const alreadyDoctor = ratingDoctor?.ratings?.find(
    (el) => el.postedBy.toString() === _id
  );
  if (alreadyDoctor) {
    await Doctor.updateOne(
      {
        _id: doctorID,
        ratings: { $elemMatch: alreadyDoctor },
      },
      {
        $set: {
          "ratings.$.star": star,
          "ratings.$.comment": comment,
          "ratings.$.updatedAt": updatedAt,
        },
      },
      { new: true }
    );
  } else {
    await Doctor.findByIdAndUpdate(
      doctorID,
      {
        $push: { ratings: { star, comment, postedBy: _id, updatedAt } },
      },
      { new: true }
    );
  }
  const updatedDoctor = await Doctor.findById(doctorID);
  const ratingCount = updatedDoctor.ratings.length;
  const sum = updatedDoctor.ratings.reduce((sum, el) => sum + +el.star, 0);

  updatedDoctor.totalRatings = Math.round((sum * 10) / ratingCount) / 10;
  await updatedDoctor.save();
  return res.status(200).json({
    success: true,
    data: `Đánh giá thành công`,
  });
});

const deleteRatingDoctor = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;

  const doctor = await Doctor.findById(id);
  doctor.ratings = doctor?.ratings?.filter(
    (el) => el.postedBy.toString() !== _id
  );

  const ratingCount = doctor.ratings.length;
  const sum = doctor.ratings.reduce((sum, el) => sum + +el.star, 0);

  doctor.totalRatings = Math.round((sum * 10) / ratingCount) / 10;
  await doctor.save();
  return res.status(200).json({
    success: true,
    message: `Xóa đánh giá thành công`,
  });
});

module.exports = {
  getAllDoctors,
  getDoctor,
  getCountDoctor,
  deleteDoctor,
  updateDoctor,
  addDoctor,
  ratingsDoctor,
  deleteRatingDoctor,
};
