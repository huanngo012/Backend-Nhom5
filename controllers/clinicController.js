const moment = require("moment");
const Clinic = require("../models/clinic");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary.config");
const convertStringToRegexp = require("../utils/helper");
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
  Object.keys(formatedQueries).forEach((key) => {
    if (!formatedQueries[key]) {
      delete formatedQueries[key];
    }
  });

  if (queries.name) {
    formatedQueries.name = {
      $regex: convertStringToRegexp(queries.name.trim()),
    };
  }
  if (queries.host) {
    formatedQueries.host = new ObjectID(queries.host);
  }
  if (queries._id) {
    formatedQueries._id = new ObjectID(queries._id);
  }

  if (queries.categoryID) {
    formatedQueries.categoryID = new ObjectID(queries.categoryID);
  }
  if (queries["address.province"]) {
    formatedQueries["address.province"] = {
      $regex: convertStringToRegexp(queries["address.province"].trim()),
    };
  }
  if (queries["address.district"]) {
    formatedQueries["address.district"] = {
      $regex: convertStringToRegexp(queries["address.district"].trim()),
    };
  }
  if (queries["address.ward"]) {
    formatedQueries["address.ward"] = {
      $regex: convertStringToRegexp(queries["address.ward"].trim()),
    };
  }

  let queryCommand = Clinic.find(formatedQueries)
    .populate("specialtyID")
    .populate("categoryID")
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
    data: response,
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
  const { name, address, host, categoryID } = req.body;
  if ((!name || !address || !host, !categoryID))
    throw new Error("Vui lòng nhập đầy đủ");

  const alreadyHost = await Clinic.find({ host: new ObjectID(host) });

  if (alreadyHost.length > 0) throw new Error("Host này đã quản lý cơ sở y tế");
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
  const { logo, descriptionImgAdd, descriptionImgDelete } = req.body;

  const { specialtyID, ...data } = req.body;
  const response = await Clinic.findByIdAndUpdate(id, data, {
    new: true,
  });
  if (logo) {
    const { url } = await cloudinary.uploader.upload(logo, {
      folder: "booking",
    });
    const urlImage = response?.logo.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
    response.logo = url;
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
  const descriptionImgNew = response?.images?.filter(
    (el1) => !descriptionImgDelete?.some((el2) => el1 === el2)
  );
  response.images = descriptionImgNew.concat(urls);

  await response.save();
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Cập nhật thông tin bệnh viện thất bại",
  });
});

const deleteClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Clinic.findByIdAndDelete(id);
  for (const image of response?.images) {
    const urlImage = image.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
  }
  if (response?.logo) {
    const urlImage = response?.logo.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
  }
  return res.status(200).json({
    success: response ? true : false,
    data: response ? response : "Xóa thất bại",
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
    message: `Thêm chuyên khoa của bệnh viện thành công`,
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
    message: `Xóa chuyên khoa của bệnh viện thành công`,
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
    message: `Đánh giá thành công`,
  });
});

const deleteRatingClinic = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;

  const clinic = await Clinic.findById(id);
  clinic.ratings = clinic?.ratings?.filter(
    (el) => el.postedBy.toString() !== _id
  );

  const ratingCount = clinic.ratings.length;
  const sum = clinic.ratings.reduce((sum, el) => sum + +el.star, 0);

  clinic.totalRatings = Math.round((sum * 10) / ratingCount) / 10;
  await clinic.save();
  return res.status(200).json({
    success: true,
    message: `Xóa đánh giá thành công`,
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
  deleteRatingClinic,
  addSpecialtyClinic,
  deleteSpecialtyClinic,
};
