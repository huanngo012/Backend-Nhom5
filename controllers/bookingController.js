const Booking = require("../models/booking");
const Schedule = require("../models/schedule");
const Patient = require("../models/patient");
const asyncHandler = require("express-async-handler");
const ObjectID = require("mongodb").ObjectId;
const cloudinary = require("../config/cloudinary.config");
const sendMail = require("../utils/sendMail");
const axios = require("axios");
const moment = require("moment");
const CryptoJS = require("crypto-js");
const convertStringToRegexp = require("../utils/helper");

const getBookings = asyncHandler(async (req, res) => {
  const { _id, role } = req.user;

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
  //Tìm theo tên bệnh nhân
  if (queries?.namePatient) {
    formatedQueries["patientID.fullName"] = {
      $regex: convertStringToRegexp(queries.namePatient.trim()),
    };
    delete formatedQueries?.namePatient;
  }

  if (queries?.status) {
    formatedQueries.status = { $regex: queries.status, $options: "i" };
  }
  if (queries?.scheduleID) {
    formatedQueries.scheduleID = new ObjectID(queries.scheduleID);
  }
  if (queries?.time) {
    formatedQueries.time = queries.time;
  }

  if (role === 4) {
    if (queries?.patientID) {
      formatedQueries.patientID = new ObjectID(queries.patientID);
    } else {
      const patients = await Patient.find({ bookedBy: _id });

      const patientIDs = patients.map((patient) => patient._id);

      formatedQueries.patientID = { $in: patientIDs };
    }
  }

  let queryCommand = Booking.find(formatedQueries)
    .populate({
      path: "scheduleID",
      populate: {
        path: "doctorID",
        model: "Doctor",
        select: { ratings: 0 },
        populate: [
          {
            path: "clinicID",
            model: "Clinic",
            select: { specialtyID: 0, ratings: 0 },
            match: role === 2 ? { host: new ObjectID(_id) } : {},
          },
          {
            path: "specialtyID",
            model: "Specialty",
          },
          {
            path: "_id",
            model: "User",
            match: role === 3 ? { _id: new ObjectID(_id) } : {},
          },
        ],
      },
    })
    .populate("patientID");

  if (req.query.sort) {
    let sortBy = req.query.sort.split(",").join(" ");
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

  let newResponse = response.filter((el) => el?.scheduleID?.doctorID !== null);
  const counts = newResponse?.length;

  return res.status(200).json({
    success: newResponse.length > 0 ? true : false,
    data: newResponse.length > 0 ? newResponse : [],
    counts,
  });
});

const addBookingByPatient = asyncHandler(async (req, res) => {
  const { _id, role, email } = req.user;
  if (role === 4) {
    const { patientID, scheduleID, time, descriptionImg, clinicID } = req.body;
    if (!scheduleID || !time) throw new Error("Vui lòng nhập đầy đủ");
    const patient = await Patient.findOne({
      _id: patientID,
      bookedBy: _id,
    });
    if (!patient) {
      throw new Error("Hồ sơ bệnh nhân không tồn tại");
    }
    const alreadySchedule = await Schedule.findById(scheduleID);
    if (!alreadySchedule) {
      throw new Error("Lịch khám bệnh không tồn tại");
    }
    const alreadyTime = alreadySchedule.timeType.find(
      (el) => el.time === time && el.full !== true
    );
    if (!alreadyTime) {
      throw new Error(
        "Thời gian khám bệnh trong ngày không tồn tại hoặc đã kín lịch"
      );
    }
    const alreadyBooking = await Booking.find({
      patientID: _id,
      time,
    }).populate({
      path: "scheduleID",
      select: "date",
    });
    if (alreadyBooking.length > 0) {
      alreadyBooking?.forEach((el) => {
        if (
          new Date(+alreadySchedule.date).getTime() ===
          new Date(+el?.scheduleID?.date).getTime()
        ) {
          throw new Error("Bạn đã đặt lịch khám thời gian này rồi");
        }
      });
    }
    let urls = [];
    if (descriptionImg) {
      for (const image of descriptionImg) {
        const { url } = await cloudinary.uploader.upload(image, {
          folder: "booking",
        });
        urls.push(url);
      }
    }

    const response = await Booking.create({
      patientID,
      scheduleID,
      time,
      descriptionImg: urls,
    });
    const alreadyClinic = patient.clinicArr.includes(clinicID);
    if (!alreadyClinic) {
      const updatePatient = patient.clinicArr.concat(clinicID);

      patient.clinicArr = updatePatient;
      await patient.save();
    }
    const bookings = await Booking.find({
      scheduleID,
      time,
      status: { $ne: "cancelled" },
    });
    if (bookings.length === alreadyTime.maxNumber) {
      await Schedule.updateOne(
        {
          _id: scheduleID,
          timeType: { $elemMatch: alreadyTime },
        },
        {
          $set: {
            "timeType.$.full": true,
          },
        },
        { new: true }
      );
    }
    const html = `Bạn đã đặt lịch thành công`;

    const data = {
      email: email,
      subject: "Xác nhận đặt lịch",
      html,
    };

    await sendMail(data);
    return res.status(200).json({
      success: response ? true : false,
      message: response ? "Đặt lịch thành công" : "Đặt lịch thất bại",
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }
});

const cancelBookingByPatient = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;

  const booking = await Booking.find({
    _id: id,
    status: "pending",
    patientID: _id,
  });

  if (booking?.length > 0) {
    await Booking.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      {
        new: true,
      }
    );
    await Schedule.updateOne(
      {
        _id: booking.scheduleID,
        timeType: { $elemMatch: { time: booking.time } },
      },
      {
        $set: {
          "timeType.$.full": false,
        },
      },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: `Hủy lịch khám thành công`,
    });
  }
  return res.status(200).json({
    success: false,
    message: `Không thể hủy lịch khám do bạn không có quyền hoặc bác sĩ đã xác nhận!!!`,
  });
});
const updatePayment = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { id } = req.params;
  const booking = await Booking.find({
    _id: id,
    patientID: _id,
  });
  if (booking) {
    await Booking.findByIdAndUpdate(
      id,
      { isPaid: true },
      {
        new: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: `Thanh toán thành công`,
    });
  }
  return res.status(200).json({
    success: false,
    message: `Thanh toán thất bại`,
  });
});

//ADMIN
const addBooking = asyncHandler(async (req, res) => {
  const { role } = req.user;

  if (role === 2) {
    const { patientID, scheduleID, time, descriptionImg, bookedBy, clinicID } =
      req.body;
    if (!scheduleID || !time || !bookedBy || !clinicID)
      throw new Error("Vui lòng nhập đầy đủ");
    const patient = await Patient.findOne({
      _id: patientID,
      bookedBy: bookedBy,
    });
    if (!patient) {
      throw new Error("Hồ sơ bệnh nhân không tồn tại");
    }
    const alreadySchedule = await Schedule.findById(scheduleID);
    if (!alreadySchedule) {
      throw new Error("Lịch khám bệnh không tồn tại");
    }
    const alreadyTime = alreadySchedule.timeType.find(
      (el) => el.time === time && el.full !== true
    );
    if (!alreadyTime) {
      throw new Error(
        "Thời gian khám bệnh trong ngày không tồn tại hoặc đã kín lịch"
      );
    }
    const alreadyBooking = await Booking.find({
      patientID: patient?._id,
      time,
    }).populate({
      path: "scheduleID",
      select: "date",
    });
    if (alreadyBooking.length > 0) {
      alreadyBooking?.forEach((el) => {
        if (
          new Date(+alreadySchedule.date).getTime() ===
          new Date(+el?.scheduleID?.date).getTime()
        ) {
          throw new Error("Bạn đã đặt lịch khám thời gian này rồi");
        }
      });
    }
    let urls = [];
    if (descriptionImg) {
      for (const image of descriptionImg) {
        const { url } = await cloudinary.uploader.upload(image, {
          folder: "booking",
        });
        urls.push(url);
      }
    }

    const response = await Booking.create({
      patientID,
      scheduleID,
      time,
      descriptionImg: urls,
    });
    const alreadyClinic = patient.clinicArr.includes(clinicID);
    if (!alreadyClinic) {
      const updatePatient = patient.clinicArr.concat(clinicID);

      patient.clinicArr = updatePatient;
      await patient.save();
    }
    const bookings = await Booking.find({
      scheduleID,
      time,
      status: { $ne: "cancelled" },
    });
    if (bookings.length === alreadyTime.maxNumber) {
      await Schedule.updateOne(
        {
          _id: scheduleID,
          timeType: { $elemMatch: alreadyTime },
        },
        {
          $set: {
            "timeType.$.full": true,
          },
        },
        { new: true }
      );
    }
    return res.status(200).json({
      success: response ? true : false,
      message: response ? "Đặt lịch thành công" : "Đặt lịch thất bại",
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }
});
const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Booking.findByIdAndUpdate(
    id,
    {
      status: req.body.status,
      description: req?.body?.description,
      isPaid: req?.body?.isPaid,
    },
    {
      new: true,
    }
  );
  return res.status(200).json({
    success: response ? true : false,
    message: response
      ? "Cập nhật trạng thái lịch khám thành công"
      : "Cập nhật trạng thái lịch khám thất bại",
  });
});

const deleteBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const response = await Booking.findByIdAndDelete(id);

  for (const image of response?.descriptionImg) {
    const urlImage = image.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(`booking/${imgName}`);
  }
  return res.status(200).json({
    success: response ? true : false,
    message: response ? `Xóa thành công` : "Xóa thất bại",
  });
});
const deleteImageBooking = asyncHandler(async (req, res) => {
  const { descriptionImg } = req.body;
  const { id } = req.params;
  for (const image of descriptionImg) {
    const urlImage = image.split("/");
    const img = urlImage[urlImage.length - 1];
    const imgName = img.split(".")[0];
    await cloudinary.uploader.destroy(imgName);
  }
  const updatedBooking = await Booking.findById(id);
  const descriptionImgNew = updatedBooking?.descriptionImg?.filter(
    (el1) => !descriptionImg?.some((el2) => el1 === el2)
  );
  updatedBooking.descriptionImg = descriptionImgNew;
  await updatedBooking.save();
  return res.status(200).json({
    success: true,
    data: `Xóa ảnh thành công`,
  });
});

const config = {
  app_id: "2554",
  key1: "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
  key2: "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

const paymentBooking = asyncHandler(async (req, res) => {
  const embed_data = {
    redirecturl: "https://docs.zalopay.vn/result",
  };

  const items = [{}];
  const transID = Math.floor(Math.random() * 1000000);
  const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
    app_user: "user123",
    app_time: Date.now(), // miliseconds
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount: 5,
    description: `Lazada - Payment for the order #${transID}`,
    bank_code: "zalopayapp",
    callback_url:
      "https://da11-2402-800-639c-962e-2df7-fbbd-656-4be0.ngrok-free.app/booking/callback-payment",
  };

  // appid|app_trans_id|appuser|amount|apptime|embeddata|item
  const data =
    config.app_id +
    "|" +
    order.app_trans_id +
    "|" +
    order.app_user +
    "|" +
    order.amount +
    "|" +
    order.app_time +
    "|" +
    order.embed_data +
    "|" +
    order.item;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  const result = await axios.post(config.endpoint, null, { params: order });
  return res.status(200).json(result.data);
});

const callbackPayment = asyncHandler(async (req, res) => {
  let result = {};
  console.log("huan");
  try {
    let dataStr = req.body.data;
    let reqMac = req.body.mac;

    let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
    console.log("mac =", mac);

    // kiểm tra callback hợp lệ (đến từ ZaloPay server)
    if (reqMac !== mac) {
      // callback không hợp lệ
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      // thanh toán thành công
      // merchant cập nhật trạng thái cho đơn hàng
      let dataJson = JSON.parse(dataStr, config.key2);
      console.log(
        "update order's status = success where app_trans_id =",
        dataJson["app_trans_id"]
      );

      result.return_code = 1;
      result.return_message = "success";
    }
  } catch (ex) {
    result.return_code = 0; // ZaloPay server sẽ callback lại (tối đa 3 lần)
    result.return_message = ex.message;
  }

  // thông báo kết quả cho ZaloPay server
  res.json(result);
});

module.exports = {
  getBookings,
  addBookingByPatient,
  cancelBookingByPatient,
  updateBooking,
  deleteBooking,
  addBooking,
  deleteImageBooking,
  updatePayment,
  paymentBooking,
  callbackPayment,
};
