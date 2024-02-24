const mongoose = require("mongoose"); // Erase if already required

const cloudinary = require("../config/cloudinary.config");

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

specialtySchema.pre(["save", "findOneAndUpdate"], async function (next) {
  if (this.name || this._update.name) {
    const alreadySpecialty = await mongoose
      .model("Specialty", specialtySchema)
      .findOne({
        _id: { $ne: this._id ? this._id : this._conditions._id },
        name: this.name ? this.name : this._update.name,
      });

    if (alreadySpecialty) {
      const error = new Error("Đã tồn tại chuyên khoa!!!");
      return next(error);
    }
  }
  next();
});

specialtySchema.pre(["save"], async function (next) {
  if (this.isNew && this.image) {
    const { url } = await cloudinary.uploader.upload(this.image, {
      folder: "booking",
    });
    this.image = url;
  }

  next();
});

specialtySchema.pre(["findOneAndUpdate"], async function (next) {
  if (this._conditions._id) {
    const alreadySpecialty = await mongoose
      .model("Specialty", specialtySchema)
      .findById(this._conditions._id);

    if (this._update?.image) {
      const { url } = await cloudinary.uploader.upload(this._update.image, {
        folder: "booking",
      });
      if (alreadySpecialty?.image) {
        const urlImage = alreadySpecialty?.image?.split("/");
        const img = urlImage[urlImage?.length - 1];
        const imgName = img?.split(".")[0];

        await cloudinary.uploader.destroy(`booking/${imgName}`);
      }
      this._update.image = url;
    }
  }

  next();
});

//Export the model
module.exports = mongoose.model("Specialty", specialtySchema);
