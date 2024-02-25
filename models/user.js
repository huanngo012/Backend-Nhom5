const mongoose = require("mongoose"); // Erase if already required
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");

const ObjectID = require("mongodb").ObjectId;
const cloudinary = require("../config/cloudinary.config");

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

userSchema.pre(["save", "findOneAndUpdate"], async function (next) {
  if (this.email || this._update.email) {
    const alreadyUser = await mongoose.model("User", userSchema).findOne({
      _id: { $ne: this._id ? this._id : this._conditions._id },
      email: this.email ? this.email : this._update.email,
      isVerified: this.isVerified,
    });

    if (alreadyUser) {
      const error = new Error("Tài khoản đã tồn tại");
      return next(error);
    }
  }

  next();
});

userSchema.pre(["findOneAndUpdate"], async function (next) {
  if (this._conditions._id) {
    const alreadyUser = await mongoose
      .model("User", userSchema)
      .findById(this._conditions._id);

    if (this._update?.avatar) {
      const { url } = await cloudinary.uploader.upload(this._update.avatar, {
        folder: "booking",
      });
      if (alreadyUser?.avatar) {
        const urlImage = alreadyUser?.avatar?.split("/");
        const img = urlImage[urlImage?.length - 1];
        const imgName = img?.split(".")[0];

        await cloudinary.uploader.destroy(`booking/${imgName}`);
      }
      this._update.avatar = url;
    }
    if (this._update?.password) {
      const salt = bcryptjs.genSaltSync(10);
      this._update.password = await bcryptjs.hash(this._update.password, salt);
    }
  }

  next();
});

userSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (this.avatar) {
      const { url } = await cloudinary.uploader.upload(this.avatar, {
        folder: "booking",
      });
      this.avatar = url;
    }
  }

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
