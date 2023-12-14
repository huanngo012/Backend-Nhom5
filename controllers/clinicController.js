const moment = require("moment");
const Clinic = require("../models/clinic");
const Specialty = require("../models/specialty");
const User = require("../models/user");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary.config");
const ObjectID = require("mongodb").ObjectId;

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
  if (queries?.host) {
    formatedQueries.host = new ObjectID(queries.host);
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

  let queryCommand = Clinic.find(formatedQueries)
    .populate("specialtyID")
    .populate({ path: "host", select: "fullName email" });

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
  const counts = await Clinic.find(formatedQueries).countDocuments();
  return res.status(200).json({
    success: response.length > 0 ? true : false,
    data: response.length > 0 ? response : "Lấy danh sách bệnh viện thất bại",
    counts,
  });
});
const getClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Clinic.findById(id)
    .populate("specialtyID")
    .populate({
      path: "ratings",
      populate: {
        path: "postedBy",
        select: "fullName avatar",
      },
    });
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
  const { name, address, image, host, descriptionImg } = req.body;
  if (!name || !address || !host) throw new Error("Vui lòng nhập đầy đủ");
  const alreadyHost = await User.find({ _id: host, role: 2 });
  if (!alreadyHost) throw new Error("Người dùng không có quyền!!!");
  if (image) {
    const { url } = await cloudinary.uploader.upload(image, {
      folder: "booking",
    });
    req.body.image = url;
  }
  let urls = [];
  if (descriptionImg) {
    for (const image of descriptionImg) {
      const { url } = await cloudinary.uploader.upload(image, {
        folder: "booking",
      });
      urls.push(url);
    }
    req.body.descriptionImg = urls;
  }
  const response = await Clinic.create(req.body);
  return res.status(200).json({
    success: response ? true : false,
    message: response ? "Thêm bệnh viện thành công" : "Thêm bệnh viện thất bại",
  });
});
const updateClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Object.keys(req.body).length === 0)
    throw new Error("Vui lòng nhập đầy đủ");
  const { image, host, descriptionImgAdd, descriptionImgDelete } = req.body;

  if (host) {
    const alreadyHost = await User.find({ _id: host, role: 2 });
    if (!alreadyHost) throw new Error("Người dùng không có quyền!!!");
  }
  const { specialtyID, ...data } = req.body;
  const response = await Clinic.findByIdAndUpdate(id, data, {
    new: true,
  });
  if (image) {
    const { url } = await cloudinary.uploader.upload(image, {
      folder: "booking",
    });
    const urlImage = response?.image.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
    response.image = url;
  }
  let urls = [];
  if (descriptionImgAdd) {
    for (const image of descriptionImgAdd) {
      const { url } = await cloudinary.uploader.upload(image, {
        folder: "booking",
      });
      urls.push(url);
    }
  }
  if (descriptionImgDelete) {
    for (const image of descriptionImgDelete) {
      const urlImage = image.split("/");
      const img = urlImage[urlImage.length - 1];
      const imgName = img.split(".")[0];
      await cloudinary.uploader.destroy(imgName);
    }
  }
  const descriptionImgNew = response?.descriptionImg?.filter(
    (el1) => !descriptionImgDelete?.some((el2) => el1 === el2)
  );
  response.descriptionImg = descriptionImgNew.concat(urls);

  await response.save();
  return res.status(200).json({
    success: response ? true : false,
    message: response
      ? "Cập nhật thông tin bệnh viện thành công"
      : "Cập nhật thông tin bệnh viện thất bại",
  });
});

const deleteClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Clinic.findByIdAndDelete(id);
  for (const image of response?.descriptionImg) {
    const urlImage = image.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
  }
  if (response?.image) {
    const urlImage = response?.image.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
  }
  return res.status(200).json({
    success: response ? true : false,
    data: response ? `Xóa thành công` : "Xóa thất bại",
  });
});

const addSpecialtyClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { specialtyID } = req.body;
  const clinic = await Clinic.findById(id);
  const notExistSpecialty = specialtyID?.filter(
    (obj1) => !clinic.specialtyID?.some((obj2) => obj1 === obj2._id.toString())
  );

  const updateSpecialtys = clinic.specialtyID.concat(notExistSpecialty);

  clinic.specialtyID = updateSpecialtys;
  await clinic.save();

  return res.status(200).json({
    success: true,
    data: `Thêm chuyên khoa của bệnh viện thành công`,
  });
});
const deleteSpecialtyClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { specialtyID } = req.body;
  const clinic = await Clinic.findById(id);

  const updateSpecialtys = clinic?.specialtyID?.filter(
    (el) => !specialtyID?.some((el2) => el._id.toString() === el2)
  );
  clinic.specialtyID = updateSpecialtys;

  await clinic.save();

  return res.status(200).json({
    success: true,
    data: `Xóa chuyên khoa của bệnh viện thành công`,
  });
});

const ratingsClinic = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { star, comment, clinicID, updatedAt } = req.body;
  if (!star || !clinicID) {
    throw new Error("Vui lòng nhập đầy đủ");
  }
  const ratingClinic = await Clinic.findById(clinicID);
  const alreadyClinic = ratingClinic?.ratings?.find(
    (el) => el.postedBy.toString() === _id
  );
  if (alreadyClinic) {
    await Clinic.updateOne(
      {
        _id: clinicID,
        ratings: { $elemMatch: alreadyClinic },
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
    await Clinic.findByIdAndUpdate(
      clinicID,
      {
        $push: { ratings: { star, comment, postedBy: _id, updatedAt } },
      },
      { new: true }
    );
  }
  const updatedClinic = await Clinic.findById(clinicID);
  const ratingCount = updatedClinic.ratings.length;
  const sum = updatedClinic.ratings.reduce((sum, el) => sum + +el.star, 0);

  updatedClinic.totalRatings = Math.round((sum * 10) / ratingCount) / 10;
  await updatedClinic.save();
  return res.status(200).json({
    success: true,
    data: `Đánh giá thành công`,
  });
});

module.exports = {
  getAllClinics,
  getClinic,
  getCountClinic,
  addClinic,
  updateClinic,
  deleteClinic,
  ratingsClinic,
  addSpecialtyClinic,
  deleteSpecialtyClinic,
};
