var mongoose = require('mongoose');

let Schema = mongoose.Schema;

const ExperienceSchema = new Schema({
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
        required: false
    },
    interallink: {
        type: Schema.Types.ObjectId,
        ref: 'project',
        required: false
    },
    causes: [{
        type: Schema.Types.ObjectId,
        ref: 'cause',
        required: false
    }],
    __v: {
        type: Number,
        select: false
    }
});

module.exports = mongoose.model('experience', ExperienceSchema);