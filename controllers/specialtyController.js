const moment = require("moment");
const Specialty = require("../models/specialty");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary.config");

const getAllSpecialtys = asyncHandler(async (req, res) => {
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
  let queryCommand = Specialty.find(formatedQueries);

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
  const counts = await Specialty.find(formatedQueries).countDocuments();
  return res.status(200).json({
    success: response.length > 0 ? true : false,
    data: response.length > 0 ? response : "Lấy danh sách chuyên khoa thất bại",
    counts,
  });
});

const getSpecialty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Specialty.findById(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response,
  });
});

const getCountSpecialty = asyncHandler(async (req, res) => {
  const previousMonth = moment()
    .month(moment().month())
    .set("date", 1)
    .format("YYYY-MM-DD HH:mm:ss");

  const totalCount = await Specialty.find().countDocuments();
  const totalNewSpecialty = await Specialty.find({
    createdAt: { $gte: new Date(previousMonth) },
  }).countDocuments();
  return res.status(200).json({
    success: totalCount ? true : false,
    data: [totalNewSpecialty, totalCount],
  });
});

const addSpecialty = asyncHandler(async (req, res) => {
  const { name, image } = req.body;
  if (!name) throw new Error("Vui lòng nhập đầy đủ");
  if (image) {
    const { url } = await cloudinary.uploader.upload(image, {
      folder: "booking",
    });

    req.body.image = url;
  }
  const response = await Specialty.create(req.body);
  return res.status(200).json({
    success: response ? true : false,
    message: response
      ? "Thêm chuyên khoa thành công"
      : "Thêm chuyên khoa thất bại",
  });
});

const updateSpecialty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const { image } = req.body;
  if (image) {
    const { url } = await cloudinary.uploader.upload(image, {
      folder: "booking",
    });
    req.body.image = url;
  }
  const response = await Specialty.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    message: response
      ? "Cập nhật thông tin chuyên khoa thành công"
      : "Cập nhật thông tin chuyên khoa thất bại",
  });
});
const deleteSpecialty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Specialty.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    message: response
      ? `Xóa chuyên khoa thành công`
      : "Xóa chuyên khoa thất bại",
  });
});

module.exports = {
  getAllSpecialtys,
  getSpecialty,
  getCountSpecialty,
  addSpecialty,
  deleteSpecialty,
  updateSpecialty,
};
