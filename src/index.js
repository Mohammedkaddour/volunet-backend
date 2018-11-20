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
const Address = require("./models/Address");
const Cause = require("./models/Cause");
const Experience = require("./models/Experience");
//const Post = require("./models/Post");
const Project = require("./models/Project");
const User = require("./models/User");

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
app.use(require("cookie-parser")());

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
mongoose.set("debug", true);
mongoose.connect(
  dbConnectionString,
  {
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
app.get("/", async function(req, res) {
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
    title: "Animal Rights",
    description: "I love animals",
    image: "/img/3njd.png"
  });

  // cause.save((err) => {
  //     res.send(cause + ' err: ' + err);
  // });
  // //5be9f760df60cd13dcac12d6
  // let exp = new Experience({

  let result = await User.find({})
    .populate(["causes", "experiences"])
    .catch(err => logger.info(err));
  logger.info(result);
  //let haha = await result[0].addCause('5be9f9cbf0fc3d14291b5c5d')
  result[0]
    .addExperience({
      title: "vol",
      description: "momtaz",
      startdate: new Date(1988, 3, 12),
      causes: []
    })
    .then(
      result => {
        logger.info(result);
      },
      err => {
        logger.info(err);
      }
    );
  res.send("ok");
});

app.post("/signup", function(req, res) {
  let parsed = JSON.parse(req.body);

  let username = parsed.username;
  let password = parsed.password;
  let fullname = parsed.fullname;

  User.findOne({ username }).exec(function(err, result) {
    if (err) {
      sendFailResponse(res, "err find by username " + err.message);
    } else {
      if (result !== null && result !== undefined) {
        sendFailResponse(res, "username already exist");
        return;
      }
      let user = new User({
        username: username,
        password: hash.hashPassword(password).hashedPassword,
        fullname: fullname
      });
      user.save(function(err, user) {
        if (err) {
          sendFailResponse(res, "error adding user to db:" + err.message);
        } else {
          let sid = sessions.setNewUserSession(user.id);
          res.set("Set-Cookie", "SID=" + sid);
          sendSuccessResponse(res, "username" + user.fullname + "added");
        }
      });
    }
  });
});

app.post("/signin", function(req, res) {
  let parsed = JSON.parse(req.body);
  let username = parsed.username;
  let password = parsed.password;

  User.findOne({
    username: username,
    password: hash.hashPassword(password).hashedPassword
  }).exec(function(err, result) {
    if (err) {
      sendFailResponse(res, "err find by user" + err.message);
    } else {
      if (result !== null) {
        let sid = sessions.setNewUserSession(result.id);
        res.set("Set-Cookie", "SID=" + sid);
        sendSuccessResponse(res, "user signed in " + result.fullname);
      } else {
        sendFailResponse(res, "username & password combination does not exist");
      }
    }
  });
});

app.get("/signout", function(req, res) {
  let sid = req.cookies.SID;
  let user = sessions.getUserBySession(sid);
  if (user) {
    sessions.removeSession(sid);
    sendSuccessResponse(res, "the user" + user + "signed out");
    return;
  }
});

app.put("/user/update", function(req, res) {
  //On Every end point
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }
  //On Every end point

  let parsed = JSON.parse(req.body);
  let address = parsed.address;
  let phonenumbers = parsed.phonenumbers;
  let image = parsed.image;
  let summary = parsed.summary;
  User.findOneAndUpdate(
    { _id: userid },
    {
      $set: {
        address: address,
        phonenumbers: phonenumbers,
        image: image,
        summary: summary
      }
    },
    { upsert: true },
    function(err, user) {
      if (err) {
        sendFailResponse(res, "err updating user info");
      } else {
        sendSuccessResponse(
          res,
          "user " + user.fullname + " info has been updated"
        );
      }
    }
  );
});

app.get("/user/", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }
  //["causes", "experiences","experiences.causes"]
  User.findOne({ _id: userid })
    .populate([
      {
        path: "experiences",
        populate: {
          path: "causes",
          model: "cause"
        }
      },
      "causes"
    ])
    .exec(function(err, result) {
      if (err) {
        sendFailResponse(res, "err finding user" + err.message);
      } else {
        sendSuccessResponse(res, "user returned successfully", "user", result);
      }
    });
});

app.get("/causes", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  Cause.find({}).exec(function(err, result) {
    if (err) {
      sendFailResponse(res, "error finding causes" + err.message);
    } else {
      sendSuccessResponse(
        res,
        "causes returned successfully",
        "cuases",
        result
      );
    }
  });
});

app.put("/user/causes/add", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }
  // let dd= new Cause({
  //   title: "humanrights",
  //   description: "humanrights descreption",
  //   image: "human"
  // })
  // dd.save(function(err){
  //   if(err){sendFailResponse(res,"err add cause")}
  // })
  let causeid = JSON.parse(req.body).id;

  Cause.findOne({ _id: causeid }).exec(function(err, newcause) {
    if (err) {
      sendFailResponse(res, "error finding cause " + err.message);
    } else {
      User.findOne({ _id: userid })
        .populate("causes")
        .exec(function(err, user) {
          if (err) {
            sendFailResponse(res, "error finding user " + err.message);
          } else {
            let alreadyexist = false;
            for (let i = 0; i < user.causes.length; i++) {
              if (newcause.id === user.causes[i].id) {
                alreadyexist = true;
              }
            }
            if (alreadyexist === true) {
              sendFailResponse(res, "cause already exist");
            } else {
              user.causes.push(newcause.id);
              user.save(function(err) {
                if (err) {
                  sendFailResponse(res, "error saving reslut" + err.message);
                } else {
                  sendSuccessResponse(res, "cause added successfully");
                }
              });
            }
          }
        });
    }
  });
});

app.delete("/user/causes/remove", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  let causeid = JSON.parse(req.body).id;

  User.findOne({ _id: userid })
    .populate("causes")
    .exec(function(err, user) {
      if (err) {
        sendFailResponse(res, "error finding cause to remove " + err.message);
      } else {
        let del = function(x) {
          if (x.id !== causeid) {
            return x;
          } else {
            return;
          }
        };
        user.causes = user.causes.filter(del);
        user.save(function(err) {
          if (err) {
            sendFailResponse(res, "error remove cause" + err.message);
          } else {
            sendSuccessResponse(res, "cause is removed");
          }
        });
      }
    });
});

app.get("/user/causes", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }
  User.findOne({ _id: userid })
    .populate("causes")
    .exec(function(err, user) {
      if (err) {
        sendFailResponse(res, "error finding user's causes" + err.message);
      } else {
        sendSuccessResponse(
          res,
          "the user cause return successfully",
          "user causes",
          user.causes
        );
      }
    });
});

app.put("/user/experiences/add", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  let parsed = JSON.parse(req.body);
  let title = parsed.title;
  let description = parsed.description;
  let startdate = parsed.startdate;
  let enddate = parsed.enddate;
  let causes = parsed.causes;

  experience = new Experience({
    title: title,
    description: description,
    startdate: startdate,
    enddate: enddate,
    causes: causes
  });
  experience.save(function(err) {
    if (err) {
      sendFailResponse(res, "error saving experince" + err.message);
    }
  });

  User.findOne({ _id: userid })
    .populate("experiences")
    .exec(function(err, user) {
      if (err) {
        sendFailResponse(res, "error finding user" + err.message);
      } else {
        user.experiences.push(experience.id);
        user.save(function(err) {
          if (err) {
            sendFailResponse(
              res,
              "error saving user experiences" + err.message
            );
          } else {
            sendSuccessResponse(res, "user experiences successfully added");
          }
        });
      }
    });
});

app.delete("/user/experiences/remove", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }
  let experienceid = JSON.parse(req.body).id;
  User.findOne({ _id: userid })
    .populate("experiences")
    .exec(function(err, user) {
      if (err) {
        sendFailResponse(res, "error finding user " + err.message);
      } else {
        let del = function(x) {
          if (x.id !== experienceid) {
            return x;
          } else {
            return;
          }
        };
        user.experiences = user.experiences.filter(del);
        user.save(function(err) {
          if (err) {
            sendFailResponse(res, "error saving user" + err.message);
          } else {
            sendSuccessResponse(res, " experience removed successfully");
          }
        });
      }
    });
});

app.put("/projects/add", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  let parsed = JSON.parse(req.body);
  let title = parsed.title;
  let description = parsed.description;
  let startdate = parsed.startdate;
  let enddate = parsed.enddate;
  let deadline = parsed.deadline;
  let peopleneeded = parsed.peopleneeded;
  let address = parsed.address;
  let image = parsed.image
  let causes = parsed.causes

  User.findOne({ _id: userid }).exec(function(err, user) {
    if (err) {
      sendFailResponse(res, "error finding user" + err.message);
    } else {
      let project = new Project({
        title: title,
        description: description,
        startdate: startdate,
        enddate: enddate,
        deadline: deadline,
        peopleneeded: peopleneeded,
        owner: user,
        address: address,
        image: image,
        causes: causes
      });
      project.save(function(err) {
        if (err) {
          sendFailResponse(res, "error saving project " + err.message);
        } else {
          sendSuccessResponse(res, "project add successfully");
        }
      });
    }
  });
});

app.delete("/projects/remove", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }
  let projectid = JSON.parse(req.body).id;
  Project.findByIdAndRemove({ _id: projectid }).exec(function(err, result) {
    if (err) {
      sendFailResponse(res, "error removing project" + err.message);
    } else {
      sendSuccessResponse(res, "project removed successfully");
    }
  });
});

app.get("/projects", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  Project.find({})
    .populate(["followers", "causes", "owner"])
    .exec(function(err, projects) {
      if (err) {
        sendFailResponse(res, "error finding projects " + err.message);
      } else {
        let nowTime = new Date();
        let sortByEndDate = function(x) {
          if (x.enddate > nowTime) {
            return true;
          }
          else {return}
        };
        projects= projects.filter(sortByEndDate)
        sendSuccessResponse(
          res,
          "projects returned successfully ",
          "Projects",
          projects
        );
      }
    });
});

app.get("/user/:id", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  User.findOne({ _id: req.params.id })
  .populate([
    {
      path: "experiences",
      populate: {
        path: "causes",
        model: "cause"
      }
    },
    "causes"
  ])
  .exec(function(err, user) {
    if (err) {
      sendFailResponse(res, "error finding user by id" + err.message);
    } else {
      sendSuccessResponse(res, "user returned successfully", "user", user);
    }
  });
});

app.put("/projects/follow/:projectid", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  User.findOne({ _id: userid }).exec(function(err, user) {
    if (err) {
      sendFailResponse(res, "error finding user " + err.message);
    } else {
      Project.findOne({ _id: req.params.projectid }).exec(function(
        err,
        project
      ) {
        if (err) {
          sendFailResponse(res, "error finding project" + err.message);
        } else {
          let alreadyfollowed = false;
          for (let i = 0; i < project.followers.length; i++) {
            if (user.id === project.followers[i]._id.toString()) {
              alreadyfollowed = true;
            }
          }
          if (alreadyfollowed === true) {
            sendFailResponse(res, "you already followed this project");
          } else {
            project.followers.push(user.id);
            project.save(function(err) {
              if (err) {
                sendFailResponse(
                  res,
                  "error saving follower to project" + err.message
                );
              } else {
                sendSuccessResponse(
                  res,
                  "user followed the project successfully"
                );
              }
            });
          }
        }
      });
    }
  });
});

app.delete("/projects/unfollow/:projectid", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }
  User.findOne({ _id: userid }).exec(function(err, user) {
    if (err) {
      sendFailResponse(res, "error finding user" + err.message);
    } else {
      Project.findOne({ _id: req.params.projectid }).exec(function(
        err,
        project
      ) {
        if (err) {
          sendFailResponse(res, "error finding project " + err.message);
        } else {
          let del = function(x) {
            if (x._id.toString() !== user.id) {
              return true;
            } else {
              return;
            }
          };
          project.followers = project.followers.filter(del);
          project.save(function(err) {
            if (err) {
              sendFailResponse(
                res,
                "error unfollow the project " + err.message
              );
            } else {
              sendSuccessResponse(res, "successfully unfollowed this project");
            }
          });
        }
      });
    }
  });
});

app.put("/projects/posts/add", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  let parsed = JSON.parse(req.body);
  let content = parsed.content;
  let projectid = parsed.projectid;

  User.findOne({ _id: userid }).exec(function(err, user) {
    if (err) {
      sendFailResponse(res, "error finding user " + err.message);
    } else {
      Project.findOne({ _id: projectid }).exec(function(err, project) {
        if (err) {
          sendFailResponse(res, "error finding project" + err.message);
        } else {
          let arrposts = {
            user: user,
            content: content,
            timestamp: new Date()
          };
          project.posts.push(arrposts);
          project.save(function(err) {
            if (err) {
              sendFailResponse(res, "error saving project" + err.message);
            } else {
              sendSuccessResponse(res, "post has been created");
            }
          });
        }
      });
    }
  });
});

app.get("/projects/:projectid", function(req, res) {
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }
  Project.findOne({ _id: req.params.projectid })
    .populate([
      {
        path: "posts.user",
        model: "user",
        select: "fullname _id"
      },
      "causes",
      "followers",
      "owner"
    ])
    .exec(function(err, project) {
      if (err) {
        sendFailResponse(res, "error finding project");
      } else {
        sendSuccessResponse(
          res,
          "project returned successfully",
          "project",
          project
        );
      }
    });
});

// {
//   path:"posts",
//   populate:{
//     path:"user",
//     model: "user"
//   }
// }

app.post("/projects/search", function(req,res){
  if (req.cookies.SID === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not found");
    return;
  }
  let sessionid = req.cookies.SID;
  let userid = sessions.getUserBySession(sessionid);
  if (userid === undefined) {
    sendFailResponse(res, "not authorized ! - sessionid not recognized");
    return;
  }

  let parsed = JSON.parse(req.body)
let searchinput = parsed.searchinput.toLowerCase()
  Project.find({})
  .populate(["followers", "causes", "owner"])
  .exec(function(err,projects){
    if(err) { sendFailResponse(err, "error finding project" +err.message)}
    else{
      let searchfunc = function(x){
        if(x.title.toLowerCase().includes(searchinput)|| x.description.toLowerCase().includes(searchinput)|| x.owner.fullname.toLowerCase().includes(searchinput)){
          return true
        }
        else{return}
      }
      projects = projects.filter(searchfunc)
      sendSuccessResponse(res, "the process of the search process done successfully", "projects", projects)
    }
  })
})