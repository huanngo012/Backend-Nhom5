const moment = require("moment-timezone");
const Doctor = require("../models/doctor");
const User = require("../models/user");
const Clinic = require("../models/clinic");
const Specialty = require("../models/specialty");
const Schedule = require("../models/schedule");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;
const cloudinary = require("../config/cloudinary.config");

const getAllDoctors = asyncHandler(async (req, res) => {
  let users = [];
  let clinics = [];
  let specialtys = [];
  let fullNameQueries;
  let nameClinicQueries;
  let nameSpecialtyQueries;
  const queries = { ...req.query };
  const exludeFields = ["limit", "sort", "page", "fields"];
  exludeFields.forEach((el) => delete queries[el]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lt|lte)\b/g,
    (macthedEl) => `$${macthedEl}`
  );
  const formatedQueries = JSON.parse(queryString);
  if (queries?.specialtyID) {
    formatedQueries.specialtyID = new ObjectID(queries.specialtyID);
  }

  //Tìm theo tên bác sĩ
  if (queries?.fullName) {
    users = await User.find({
      fullName: { $regex: queries.fullName, $options: "i" },
      role: 3,
    });
    users?.forEach((item, index, array) => {
      array[index] = {
        _id: new ObjectID(item._id),
      };
    });
    if (users?.length < 1) {
      throw new Error("Không tìm thấy bác sĩ!!!");
    }
    fullNameQueries = { $or: users };
  }
  delete formatedQueries?.fullName;

  //Tìm theo tên bệnh viện
  if (queries?.nameClinic) {
    clinics = await Clinic.find({
      name: { $regex: queries.nameClinic, $options: "i" },
    });
    clinics?.forEach((item, index, array) => {
      array[index] = {
        clinicID: new ObjectID(item._id),
      };
    });
    if (clinics?.length < 1) {
      throw new Error("Không tìm thấy bác sĩ!!!");
    }
    nameClinicQueries = { $or: clinics };
  }
  delete formatedQueries?.nameClinic;

  //Tìm theo tên chuyên khoa
  if (queries?.nameSpecialty) {
    specialtys = await Specialty.find({
      name: { $regex: queries.nameSpecialty, $options: "i" },
    });
    specialtys?.forEach((item, index, array) => {
      array[index] = {
        specialtyID: new ObjectID(item._id),
      };
    });
    if (specialtys?.length < 1) {
      throw new Error("Không tìm thấy bác sĩ!!!");
    }
    nameSpecialtyQueries = { $or: specialtys };
  }
  delete formatedQueries?.nameSpecialty;

  q = {
    ...formatedQueries,
    ...fullNameQueries,
    ...nameClinicQueries,
    ...nameSpecialtyQueries,
  };
  let queryCommand = Doctor.find(q).populate({
    path: "_id",
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

  const response = await queryCommand
    .select("-ratings")
    .populate({
      path: "specialtyID",
      select: "name description image",
    })
    .populate({
      path: "clinicID",
      select: "name address description image",
    })
    .exec();
  const counts = await Doctor.find(q).countDocuments();
  //Get Days
  let currentDate = moment();
  let startDate = currentDate.clone().startOf("isoweek");
  let endDate = currentDate.clone().endOf("isoweek");
  const newResponse = [];

  for (const doctor of response) {
    const schedules = await Schedule.find({
      doctorID: doctor?._id,
      date: { $gte: startDate, $lte: endDate },
    });

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

  return res.status(200).json({
    success: newResponse ? true : false,
    data: newResponse ? newResponse : "Lấy danh sách bác sĩ không thành công",
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
  const { id, clinicID, specialtyID, description, roomID, position } = req.body;
  const { _id, role } = req.user;
  if (role == 3) {
    const isHost = await Clinic.find({ _id: clinicID, host: _id });
    if (!isHost) throw new Error("Bệnh viện này không thuộc quyền quản lý!!!");
  }

  const user = await User.findById(id);
  const alreadyDotor = await Doctor.findById(id);
  if (user?.role !== 3 || !user || alreadyDotor)
    throw new Error(
      "Người dùng này không có quyền bác sĩ hoặc đã tồn tại thông tin bác sĩ này. Không thể thêm mới!!!"
    );

  if (!description || !roomID || !specialtyID || !clinicID)
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
      specialtyID,
      position,
      clinicID,
      description,
      roomID,
    });
    return res.status(200).json({
      success: response ? true : false,
      message: response
        ? "Thêm thông tin bác sĩ thành công"
        : "Thêm thông tin bác sĩ thất bại",
    });
  }
  return res.status(200).json({
    success: false,
    mesage: "Bệnh viện hoặc Chuyên khoa không tồn tại",
  });
});
const updateDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id, role } = req.user;
  const { specialtyID, clinicID, avatar } = req.body;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const doctor = await Doctor.findById(id).populate("clinicID");

  if (role == 3) {
    delete req.body?.clinicID;
    if (doctor?.clinicID?.host !== _id)
      throw new Error("Bệnh viện này không thuộc quyền quản lý!!!");
  }

  if (specialtyID) {
    if (clinicID) {
      const clinic = await Clinic.findById(clinicID);
      const alreadySpecialty = clinic?.specialtyID?.find(
        (el) => el === specialtyID
      );
      if (!alreadySpecialty) {
        throw new Error("Bệnh viện không tồn tại chuyên khoa này");
      }
    } else {
      const specialty = doctor?.clinicID?.specialtyID?.find(
        (el) => el === specialtyID
      );
      if (!specialty) {
        throw new Error("Bệnh viện không tồn tại chuyên khoa này");
      }
    }
  }

  if (avatar) {
    const { url } = await cloudinary.uploader.upload(avatar, {
      folder: "booking",
    });
    req.body.avatar = url;
  }
  await User.findByIdAndUpdate(id, {
    avatar: req.body.avatar,
  });
  const response = await Doctor.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    message: response
      ? "Cập nhật thông tin bác sĩ thành công"
      : "Cập nhật thông tin bác sĩ thất bại",
  });
});
const deleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { _id, role } = req.user;
  const doctor = await Doctor.findById(id);
  if (role == 3) {
    const isHost = await Clinic.find({ _id: doctor.clinicID, host: _id });
    if (!isHost) throw new Error("Bệnh viện này không thuộc quyền quản lý!!!");
  }
  const response = await Doctor.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? `Xóa thành công` : "Xóa thất bại",
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

module.exports = {
  getAllDoctors,
  getDoctor,
  getCountDoctor,
  deleteDoctor,
  updateDoctor,
  addDoctor,
  ratingsDoctor,
};
