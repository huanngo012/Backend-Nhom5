const Medicine = require("../models/medicine");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;

const createMedicine = asyncHandler(async (req, res) => {
  const { name, specialtyID, clinicID, price, quantity } = req.body;
  if (!name || !specialtyID || !clinicID || !price || !quantity) {
    throw new Error("Vui lòng nhập đầy đủ");
  }
  const response = await Medicine.create(req.body);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Thêm thuốc thất bại",
  });
});
const getMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Medicine.findById(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Lấy dữ liệu thuốc thất bại",
  });
});
const getMedicines = asyncHandler(async (req, res) => {
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
  //Tìm theo ID Specialty
  if (queries.specialtyID) {
    formatedQueries.specialtyID = new ObjectID(queries.specialtyID);
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
  let queryCommand = Medicine.find(formatedQueries)
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

  const counts = (await Medicine.find(formatedQueries)).length;
  return res.status(200).json({
    success: response.length > 0 ? true : false,
    data: response,
    counts,
  });
});
const updateMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const response = await Medicine.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật thuốc thất bại",
  });
});
const deleteMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Medicine.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Xóa thuốc thất bại",
  });
});

module.exports = {
  createMedicine,
  getMedicines,
  getMedicine,
  updateMedicine,
  deleteMedicine,
};
