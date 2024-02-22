const mongoose = require("mongoose"); // Erase if already required
const ObjectID = require("mongodb").ObjectId;
const convertStringToRegexp = require("../utils/helper");

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

//Export the model
module.exports = mongoose.model("Clinic", clinicSchema);
