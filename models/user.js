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
    avatar: {
      type: String,
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
    //
    refreshToken: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailToken: {
      type: String,
    },
    emailTokenExpires: {
      type: String,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
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
  createEmailToken: function () {
    const token = crypto.randomBytes(32).toString("hex");
    this.emailToken = crypto.createHash("sha256").update(token).digest("hex");
    this.emailTokenExpires = Date.now() + 15 * 60 * 1000;
    return token;
  },
  createPassworChangedToken: function () {
    const otp = Math.floor(100000 + Math.random() * 900000);
    this.passwordResetToken = otp;
    this.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    return otp;
  },
};
//Export the model
module.exports = mongoose.model("User", userSchema);
