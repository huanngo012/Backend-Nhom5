const mongoose = require("mongoose"); // Erase if already required
const { MongooseFindByReference } = require("mongoose-find-by-reference");

// Declare the Schema of the Mongo model
var bookingSchema = new mongoose.Schema(
  {
    patientID: {
      type: mongoose.Types.ObjectId,
      ref: "Patient",
    },
    description: {
      type: String,
    },
    descriptionImg: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      default: "pending",
      enum: ["cancelled", "pending", "confirmed", "examined", "leaved"],
    },

    scheduleID: {
      type: mongoose.Types.ObjectId,
      ref: "Schedule",
    },
    time: {
      type: String,
      required: true,
    },
    qr_code: {
      type: String,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.plugin(MongooseFindByReference);

//Export the model
module.exports = mongoose.model("Booking", bookingSchema);
