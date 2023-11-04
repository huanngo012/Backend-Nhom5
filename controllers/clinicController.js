const moment = require("moment");
const Clinic = require("../models/clinic");
const Specialty = require("../models/specialty");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary.config");

const getAllClinics = asyncHandler(async (req, res) => {
  const queries = { ...req.query };
  const exludeFields = ["limit", "sort", "page", "fields"];
  exludeFields.forEach((el) => delete queries[el]);
  let queryString = JSON.stringify(queries);
  queryString = queryString.replace(
    /\b(gte|gt|lt|lte)\b/g,
    (macthedEl) => `$${macthedEl}`
  );
  const formatedQueries = JSON.parse(queryString);
  if (queries?.name) {
    formatedQueries.name = { $regex: queries.name, $options: "i" };
  }
  if (queries["address.province"]) {
    formatedQueries["address.province"] = {
      $regex: queries["address.province"],
      $options: "i",
    };
  }
  if (queries["address.district"]) {
    formatedQueries["address.district"] = {
      $regex: queries["address.district"],
      $options: "i",
    };
  }
  if (queries["address.ward"]) {
    formatedQueries["address.ward"] = {
      $regex: queries["address.ward"],
      $options: "i",
    };
  }

  let queryCommand = Clinic.find(formatedQueries);

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
  const counts = await Clinic.find(formatedQueries).countDocuments();
  return res.status(200).json({
    success: response.length > 0 ? true : false,
    data: response.length > 0 ? response : "Lấy danh sách bệnh viện thất bại",
    counts,
  });
});
const getClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Clinic.findById(id).populate("specialtyID");
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Bệnh viện không tồn tại",
  });
});

const getCountClinic = asyncHandler(async (req, res) => {
  const previousMonth = moment()
    .month(moment().month())
    .set("date", 1)
    .format("YYYY-MM-DD HH:mm:ss");

  const totalCount = await Clinic.find().countDocuments();
  const totalNewClinic = await Clinic.find({
    createdAt: { $gte: new Date(previousMonth) },
  }).countDocuments();
  return res.status(200).json({
    success: totalCount ? true : false,
    data: [totalNewClinic, totalCount],
  });
});

const addClinic = asyncHandler(async (req, res) => {
  const { name, address, image, host } = req.body;
  if (!name || !address || !host) throw new Error("Vui lòng nhập đầy đủ");
  const alreadyHost = await User.find({ _id: host, role: 2 });
  if (!alreadyHost) throw new Error("Người dùng không có quyền!!!");
  if (image) {
    const { url } = await cloudinary.uploader.upload(image, {
      folder: "booking",
    });
    req.body.image = url;
  }
  const response = await Clinic.create(req.body);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Thêm bệnh viện thất bại",
  });
});
const updateClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const { image, host } = req.body;
  if (image) {
    const { url } = await cloudinary.uploader.upload(image, {
      folder: "booking",
    });
    req.body.image = url;
  }
  if (host) {
    const alreadyHost = await User.find({ _id: host, role: 2 });
    if (!alreadyHost) throw new Error("Người dùng không có quyền!!!");
  }
  const response = await Clinic.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật thông tin bệnh viện thất bại",
  });
});

const deleteClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Clinic.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? `Xóa thành công` : "Xóa thất bại",
  });
});

const updateClinicByHost = asyncHandler(async (req, res) => {
  let path;
  const { id } = req.params;
  const { _id } = req.user;
  const isHost = await Clinic.find({ _id: id, host: _id });
  if (!isHost) throw new Error("Người dùng không có quyền!!!");
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const { image, host, ...data } = req.body;
  if (image) {
    const { url } = await cloudinary.uploader.upload(image, {
      folder: "booking",
    });
    path = url;
  }
  const response = await Clinic.findByIdAndUpdate(
    id,
    { ...data, image: path },
    {
      new: true,
    }
  );
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật thông tin bệnh viện thất bại",
  });
});

module.exports = {
  getAllClinics,
  getClinic,
  getCountClinic,
  addClinic,
  updateClinic,
  deleteClinic,
  updateClinicByHost,
};