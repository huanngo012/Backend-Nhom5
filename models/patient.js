const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var patientSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE"],
    },
    dob: {
      type: Date,
      required: true,
    },
    bookedBy: { type: mongoose.Types.ObjectId, ref: "User" },
    clinicArr: [{ type: mongoose.Types.ObjectId, ref: "Clinic" }],
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Patient", patientSchema);
