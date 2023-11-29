const mongoose = require("mongoose"); // Erase if already required
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    avatar: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE"],
    },

    address: {
      type: String,
      default: "",
    },
    role: {
      type: Number,
      default: 4,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = bcryptjs.genSaltSync(10);
  this.password = await bcryptjs.hash(this.password, salt);
});
userSchema.methods = {
  isCorrectPassword: async function (password) {
    return await bcryptjs.compare(password, this.password);
  },
};
//Export the model
module.exports = mongoose.model("User", userSchema);
