const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var categorySchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.pre(["save", "findOneAndUpdate"], async function (next) {
  if (this.tag || this._update.tag) {
    const alreadyCategory = await mongoose
      .model("Category", categorySchema)
      .findOne({
        _id: { $ne: this._id ? this._id : this._conditions._id },
        tag: this.tag ? this.tag : this._update.tag,
      });

    if (alreadyCategory) {
      const error = new Error("Đã tồn tại danh mục này!!!");
      return next(error);
    }
  }
  next();
});

//Export the model
module.exports = mongoose.model("Category", categorySchema);
