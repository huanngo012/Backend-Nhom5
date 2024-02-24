const Patient = require("../models/patient");
const asyncHandler = require("express-async-handler");

const getPatients = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const response = await Patient.find({ bookedBy: _id });
  return res.status(200).json({
    success: true,
    data: response,
  });
});
const addPatient = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { fullName, phone, gender, dob } = req.body;
  if (!fullName || !phone || !gender || !dob)
    throw new Error("Vui lòng nhập đầy đủ");
  req.body.dob = new Date(+dob);
  req.body.dob.setHours(7, 0, 0, 0);
  req.body.dob.setDate(req.body.dob.getDate());
  const response = await Patient.create({ ...req.body, bookedBy: _id });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Thêm hồ sơ bệnh nhân thất bại",
  });
});
const updatePatient = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const patient = await Patient.find({ bookedBy: _id });
  if (!patient) throw new Error("Bạn không có quyền chỉnh sửa");
  if (req.body.dob) {
    req.body.dob = new Date(+req.body.dob);
    req.body.dob.setHours(7, 0, 0, 0);
    req.body.dob.setDate(req.body.dob.getDate());
  }
  const response = await Patient.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật hồ sơ bệnh nhân thất bại",
  });
});

const deletePatient = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;
  const patient = await Patient.find({ bookedBy: _id });
  if (!patient) throw new Error("Bạn không có quyền chỉnh sửa");
  const response = await Patient.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Xóa hồ sơ bệnh nhân thất bại",
  });
});

module.exports = {
  getPatients,
  addPatient,
  updatePatient,
  deletePatient,
};
