const mongoose = require("mongoose"); // Erase if already required
const { MongooseFindByReference } = require("mongoose-find-by-reference");

// Declare the Schema of the Mongo model
var medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    clinicID: {
      type: mongoose.Types.ObjectId,
      ref: "Clinic",
    },
    specialtyID: {
      type: mongoose.Types.ObjectId,
      ref: "Specialty",
    },

    description: {
      type: String,
    },
    price: {
      type: Number,
    },
    quantity: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

medicineSchema.plugin(MongooseFindByReference);

//Export the model
module.exports = mongoose.model("Medicine", medicineSchema);
