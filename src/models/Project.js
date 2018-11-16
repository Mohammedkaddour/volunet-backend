const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const AddressSchema = require("./Address");

const ProjectSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  startdate: {
    type: Date,
    required: true
  },
  enddate: {
    type: Date,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  causes: [
    {
      type: Schema.Types.ObjectId,
      ref: "cause",
      required: false
    }
  ],
  peopleneeded: {
    type: Number,
    required: true
  },
  estimatedcost: {
    type: Number,
    required: false
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  followers: [
    {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true
    }
  ],
  address: {
    type: AddressSchema,
    required: true
  },
  image: {
    type: String,
    required: false
  }
});

module.exports = mongoose.model("project", ProjectSchema);
