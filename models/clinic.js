const mongoose = require("mongoose"); // Erase if already required
const ObjectID = require("mongodb").ObjectId;
const cloudinary = require("../config/cloudinary.config");

const User = require("./user");

// Declare the Schema of the Mongo model
var clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    logo: {
      type: String,
    },
    address: {
      province: String,
      district: String,
      ward: String,
      detail: String,
    },
    images: [
      {
        type: String,
      },
    ],
    description: {
      type: String,
    },
    specialtyID: [{ type: mongoose.Types.ObjectId, ref: "Specialty" }],
    categoryID: { type: mongoose.Types.ObjectId, ref: "Category" },
    host: { type: mongoose.Types.ObjectId, ref: "User" },
    ratings: [
      {
        star: { type: Number },
        postedBy: { type: mongoose.Types.ObjectId, ref: "User" },
        comment: { type: String },
        updatedAt: { type: Date, default: Date.now() },
      },
    ],
    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

clinicSchema.pre(["save", "findOneAndUpdate"], async function (next) {
  if (this.name || this._update.name) {
    const alreadyClinic = await mongoose.model("Clinic", clinicSchema).findOne({
      _id: { $ne: this._id ? this._id : this._conditions._id },
      name: this.name ? this.name : this._update.name,
    });
    if (alreadyClinic) {
      const error = new Error("Đã tồn tại bệnh viện!!!");
      return next(error);
    }
  }
  if (this.host || this._update.host) {
    const alreadyHost = await User.findOne({
      _id: new ObjectID(this.host ? this.host : this._update.host),
      role: 2,
    });
    if (!alreadyHost) {
      const error = new Error("Người dùng không có quyền!!!");
      return next(error);
    }
  }

  next();
});
clinicSchema.pre(["save"], async function (next) {
  if (this.isNew) {
    if (this.logo) {
      const { url } = await cloudinary.uploader.upload(this.logo, {
        folder: "booking",
      });
      this.logo = url;
    }
    let urls = [];
    if (this.images) {
      for (const image of this.images) {
        const { url } = await cloudinary.uploader.upload(image, {
          folder: "booking",
        });
        urls.push(url);
      }
      this.images = urls;
    }
  }
  next();
});

//Export the model
module.exports = mongoose.model("Clinic", clinicSchema);
