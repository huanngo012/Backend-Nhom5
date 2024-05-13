const mongoose = require("mongoose"); // Erase if already required
const { MongooseFindByReference } = require("mongoose-find-by-reference");

// Declare the Schema of the Mongo model
var recordSchema = new mongoose.Schema(
  {
    bookingID: {
      type: mongoose.Types.ObjectId,
      ref: "Booking",
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

recordSchema.plugin(MongooseFindByReference);

//Export the model
module.exports = mongoose.model("Record", recordSchema);
