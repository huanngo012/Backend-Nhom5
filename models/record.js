const mongoose = require("mongoose"); // Erase if already required
const { MongooseFindByReference } = require("mongoose-find-by-reference");

// Declare the Schema of the Mongo model
var recordSchema = new mongoose.Schema(
  {
    bookingID: {
      type: mongoose.Types.ObjectId,
      ref: "Booking",
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
    medicineArr: [
      {
        medicineID: { type: mongoose.Types.ObjectId, ref: "Medicine" },
        instraction: {
          type: String,
          default: "after",
          enum: ["before", "after"],
        },
        dosage: [
          {
            type: String,
            enum: ["m", "a", "e"],
            unique: true,
          },
        ],
        quantity: {
          type: Number,
        },
        price: {
          type: Number,
        },
        isPaid: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

recordSchema.plugin(MongooseFindByReference);

//Export the model
module.exports = mongoose.model("Record", recordSchema);
