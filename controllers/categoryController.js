const Category = require("../models/category");
const asyncHandler = require("express-async-handler");

const createCategory = asyncHandler(async (req, res) => {
  if (!req.body.tag) throw new Error("Vui lòng nhập đầy đủ");
  const response = await Category.create(req.body);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Tạo danh mục bệnh viện mới thất bại",
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
  const response = await Category.find();
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Lấy dữ liệu các danh mục bệnh viện thất bại",
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
};
