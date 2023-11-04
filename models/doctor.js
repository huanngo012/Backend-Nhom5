const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var doctorSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    specialtyID: {
      type: mongoose.Types.ObjectId,
      ref: "Specialty",
    },
    clinicID: {
      type: mongoose.Types.ObjectId,
      ref: "Clinic",
    },
    description: {
      type: String,
    },
    roomID: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Doctor", doctorSchema);
