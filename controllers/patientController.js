const Patient = require("../models/patient");
const asyncHandler = require("express-async-handler");
const convertStringToRegexp = require("../utils/helper");

const getPatients = asyncHandler(async (req, res) => {
  const { _id, role } = req.user;
  if (role === 4) {
    const response = await Patient.find({ bookedBy: _id }).select("-clinicArr");
    return res.status(200).json({
      success: true,
      data: response,
    });
  } else {
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
    if (queries.clinicID) {
      formatedQueries.clinicArr = queries.clinicID;
      delete formatedQueries?.clinicID;
    }
    if (queries?.fullName) {
      formatedQueries.fullName = {
        $regex: convertStringToRegexp(queries.fullName.trim()),
      };
    }

    let queryCommand = Patient.find(formatedQueries)
      .populate("bookedBy")
      .select("-clinicArr");

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

    const counts = (await Patient.find(formatedQueries)).length;
    return res.status(200).json({
      success: response.length > 0 ? true : false,
      data: response,
      counts,
    });
  }
});
const addPatient = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { fullName, phone, gender, dob } = req.body;
  if (!fullName || !phone || !gender || !dob)
    throw new Error("Vui lòng nhập đầy đủ");
  req.body.dob = new Date(+dob);
  req.body.dob.setHours(0, 0, 0, 0);
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
  const before = req.body.dob;

  if (req.body.dob) {
    req.body.dob = new Date(+req.body.dob);
    req.body.dob.setHours(0, 0, 0, 0);
    req.body.dob.setDate(req.body.dob.getDate());
  }
  const after = req.body.dob;
  const response = await Patient.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật hồ sơ bệnh nhân thất bại",
    before,
    after,
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
