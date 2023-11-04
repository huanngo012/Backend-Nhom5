const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var specialtySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

//Export the model
module.exports = mongoose.model("Specialty", specialtySchema);
