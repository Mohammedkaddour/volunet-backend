const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const AddressSchema = require('./Address');
const Cause = require('./Cause');
const Experience = require('./Experience');


const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    fullname: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    address: {
        type: AddressSchema,
        required: false
    },
    phonenumbers: [{
        type: String,
        required: false
    }],
    image: {
        type: String,
        required: false
    },
    summary: {
        type: String,
        required: false
    },
    experiences: [{
        type: Schema.Types.ObjectId,
        ref: 'experience',
        required: false
    }],
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

UserSchema.methods.addCause = async function (causeid) {
    if (!await Cause.exists({
            _id: causeid
        })) throw new Error(`cause "${causeid}" not found in the database`);
    for (let i = 0; i < this.causes.length; i++) {
        if (this.causes[i].id === causeid)
            throw new Error(`cause "${this.causes[i].title}" already exists in the user causes list`);
    }
    this.causes.push(causeid);
    await this.save((err) => {
        if (err) throw err;
    });
    return true;
};

UserSchema.methods.addExperience = async function (experience) {
    let exp = new Experience(experience);
    await exp.save().catch(err => {
        throw err
    });
    this.experiences.push(exp);
    await this.save().catch(err => {
        throw err
    });
    return true;
}

UserSchema.methods.comparePassword = function (password) {
    return this.password === password;
};

module.exports = mongoose.model('user', UserSchema);