const mongoose = require("mongoose"); // Erase if already required
const { MongooseFindByReference } = require("mongoose-find-by-reference");

// Declare the Schema of the Mongo model
var scheduleSchema = new mongoose.Schema(
  {
    doctorID: {
      type: mongoose.Types.ObjectId,
      ref: "Doctor",
    },
    cost: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
    },
    timeType: [
      {
        _id: false,
        time: {
          type: String,
          enum: [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
          ],
        },
        maxNumber: {
          type: Number,
          default: 3,
        },
        full: {
          type: Boolean,
          default: false,
        },
      },
    ],

    isRemote: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

scheduleSchema.plugin(MongooseFindByReference);

//Export the model
module.exports = mongoose.model("Schedule", scheduleSchema);
