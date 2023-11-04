const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    address: {
      province: String,
      district: String,
      ward: String,
      detail: String,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    specialtyID: [{ type: mongoose.Types.ObjectId, ref: "Specialty" }],
    host: { type: mongoose.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Clinic", clinicSchema);
