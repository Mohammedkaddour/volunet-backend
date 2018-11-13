const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CauseSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: false
    },
    __v: {
        type: Number,
        select: false
    }
});

module.exports = mongoose.model('cause', CauseSchema);