const Category = require("../models/category");
const asyncHandler = require("express-async-handler");
const moment = require("moment");
const convertStringToRegexp = require("../utils/helper");

const createCategory = asyncHandler(async (req, res) => {
  if (!req.body.tag) throw new Error("Vui lòng nhập đầy đủ");
  const response = await Category.create(req.body);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Tạo danh mục bệnh viện mới thất bại",
  });
});

const getCountCateogry = asyncHandler(async (req, res) => {
  const previousMonth = moment()
    .month(moment().month())
    .set("date", 1)
    .format("YYYY-MM-DD HH:mm:ss");

  const totalCount = await Category.find().countDocuments();
  const totalNewCategory = await Category.find({
    createdAt: { $gte: new Date(previousMonth) },
  }).countDocuments();
  return res.status(200).json({
    success: totalCount ? true : false,
    data: [totalNewCategory, totalCount],
  });
});

const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Category.findById(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Lấy dữ liệu danh mục bệnh viện thất bại",
  });
});
const getCategories = asyncHandler(async (req, res) => {
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

  if (queries.tag) {
    formatedQueries.tag = {
      $regex: convertStringToRegexp(queries.tag.trim()),
    };
  }

  let queryCommand = Category.find(formatedQueries);

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
  const counts = await Category.find(formatedQueries).countDocuments();
  return res.status(200).json({
    success: response.length > 0 ? true : false,
    data: response,
    counts,
  });
});
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const response = await Category.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật danh mục bệnh viện thất bại",
  });
});
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Category.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Xóa danh mục bệnh viện thất bại",
  });
});

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getCountCateogry,
};
