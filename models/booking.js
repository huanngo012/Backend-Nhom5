const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var bookingSchema = new mongoose.Schema({
  patientID: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    default: "Đang xử lý",
    enum: ["Đã hủy", "Đang xử lý", "Đã duyệt", "Thành công"],
  },
  description: {
    type: String,
  },
  scheduleID: {
    type: mongoose.Types.ObjectId,
    ref: "Schedule",
  },
  time: {
    type: String,
    required: true,
  },
});

//Export the model
module.exports = mongoose.model("Booking", bookingSchema);
