const Record = require("../models/record");
const Booking = require("../models/booking");
const Medicine = require("../models/medicine");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;

const createRecord = asyncHandler(async (req, res) => {
  const {
    bookingID,
    specialtyID,
    clinicID,
    description,
    medicineArr,
    totalPrice,
  } = req.body;
  if (
    !bookingID ||
    !specialtyID ||
    !clinicID ||
    !description ||
    !medicineArr ||
    !totalPrice
  ) {
    throw new Error("Vui lòng nhập đầy đủ");
  }

  const response = await Record.create(req.body);
  response &&
    (await Booking.findByIdAndUpdate(
      bookingID,
      { status: "examined" },
      {
        new: true,
      }
    ));
  response &&
    medicineArr.map(async (el) => {
      const medicine = await Medicine.findById(el?.medicineID);
      medicine.quantity = medicine.quantity - el?.quantity;
      await medicine.save();
    });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Thêm kết quả khám bệnh thất bại",
  });
});
const getRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { bookingID } = req.body;
  console.log(bookingID);
  const response = await Record.findOne({ _id: id, bookingID })
    .populate("specialtyID")
    .populate({
      path: "clinicID",
      select: "name address logo",
    })
    .populate({
      path: "medicineArr.medicineID",
    })
    .populate({
      path: "bookingID",
      populate: {
        path: "scheduleID",
      },
    });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Lấy kết quả khám bệnh thất bại",
  });
});
const getRecords = asyncHandler(async (req, res) => {
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
  //Tìm theo ID Patient
  if (queries.patientID) {
    formatedQueries["bookingID.patientID"] = new ObjectID(queries.patientID);
    delete formatedQueries?.patientID;
  }
  //Tìm theo ID Booking
  if (queries.bookingID) {
    formatedQueries.bookingID = new ObjectID(queries.bookingID);
  }
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
  let queryCommand = Record.find(formatedQueries)
    .populate("specialtyID")
    .populate({
      path: "clinicID",
      select: "name address logo",
    })
    .populate({
      path: "medicineArr.medicineID",
    })
    .populate({
      path: "bookingID",
      populate: {
        path: "scheduleID",
      },
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

  const counts = (await Record.find(formatedQueries)).length;
  return res.status(200).json({
    success: response.length > 0 ? true : false,
    data: response,
    counts,
  });
});
const updateRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const response = await Record.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật thuốc thất bại",
  });
});
const deleteRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Record.findByIdAndDelete(id);
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Xóa thuốc thất bại",
  });
});

module.exports = {
  createRecord,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
};
