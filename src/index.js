////////////////////////////App Config////////////////////////////
const config = require("config");
const dbConnectionString = config.get("dbConfig").connectionstring;
const portNumber = config.get("appConfig").port;

////////////////////////////Utils Import////////////////////////////
//SessionsPool
const SessionsPool = require("./utils/SessionsPool");
//Logger
const logger = require("./utils/Winston");
//Response Message Class
const ResponseMessage = require("./utils/ResponseMessage");
//Password Hash
const hash = require("./utils/PasswordHash");
//Sessions
let sessions = new SessionsPool();

////////////////////////////Models////////////////////////////
const Address = require('./models/Address');
const Cause = require('./models/Cause');
const Experience = require('./models/Experience');
const Post = require('./models/Post');
const Project = require('./models/Project');
const User = require('./models/User');

////////////////////////////App Initialization////////////////////////////
const express = require("express");
const app = express();
//Body Parser
app.use(
    require("body-parser").raw({
        type: "*/*"
    })
);
//Cookie Parser
app.use(require('cookie-parser')());

////////////////////////////Mongoose Initialization////////////////////////////
const mongoose = require("mongoose");
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
let db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on("error", console.error.bind(console, "MongoDB connection error:"));



////////////////////////////Helper Functions////////////////////////////
const sendFailResponse = (res, msg, objName, obj) => {
    if (!objName) {
        let responseMsg = new ResponseMessage(false, msg);
        logger.info("fail response: " + msg);
        res.send(responseMsg.toString());
    } else {
        let responseMsg = new ResponseMessage(false, msg, {
            name: objName,
            value: obj
        });
        logger.info("fail response: " + msg);
        res.send(responseMsg.toString());
    }
};

const sendSuccessResponse = (res, msg, objName, obj) => {
    if (!objName) {
        let responseMsg = new ResponseMessage(true, msg);
        logger.info("success response: " + msg);
        res.send(responseMsg.toString());
    } else {
        let responseMsg = new ResponseMessage(true, msg, {
            name: objName,
            value: obj
        });
        logger.info("success response: " + msg);
        res.send(responseMsg.toString());
    }
};

////////////////////////////Server Start////////////////////////////
//Connect to database and then start the server on the port
mongoose.set('debug', true);
mongoose.connect(
    dbConnectionString, {
        useNewUrlParser: true,
        useCreateIndex: true
    },
    () => {
        app.listen(portNumber, () => {
            logger.info(`listen on port ${portNumber}`);
        });
    }
);

////////////////////////////End Points////////////////////////////
app.get('/', async function(req, res){
    // let user = new User({
    //     email: 'bob@yahoo.com',
    //     fullname: 'bob',
    //     password: 'bob',
    //     address: {
    //         details: '100',
    //         city: 'montreal',
    //         state: 'qc',
    //         zip: 'H4N1C7'
    //     },
    //     phonenumbers: ['514514514','123123123'],
    //     image: '/123',
    //     summary: 'adsjkadfkjllaksjdflkj\nlasjdfjnmnwnmmnwemnrmnwmnermn',
    //     experiences: [],
    //     causes: ['5be9f9cbf0fc3d14291b5c5d']
    // });

    let cause = new Cause({
        title: 'Animal Rights',
        description: 'I love animals',
        image: '/img/3njd.png'
    });

    // cause.save((err) => {
    //     res.send(cause + ' err: ' + err);
    // });
    // //5be9f760df60cd13dcac12d6
    // let exp = new Experience({

    let result = await User.find({}).populate(['causes','experiences']).catch(err => logger.info(err));
    logger.info(result);
    //let haha = await result[0].addCause('5be9f9cbf0fc3d14291b5c5d')
    result[0].addExperience({
        title: "vol",
        description: "momtaz",
        startdate: new Date(1988,3,12),
        causes: []
    }).then(result => {
        logger.info(result);
    }, err => {
        logger.info(err);
    });
    res.send("ok")
});