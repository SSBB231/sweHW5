//App Globals=================================================

const express = require('express');
var fetch = require('node-fetch');
const app = express();
var router = express.Router();
const port = process.env.PORT || 5000;
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

//Firebase
let firebase = require("firebase");

//End App Globals=============================================
let config = {
    apiKey: "AIzaSyA1JB3yBWizGxgFvi-yS2LkGpxyflytshQ",
    authDomain: "swehw4.firebaseapp.com",
    databaseURL: "https://swehw4.firebaseio.com",
    projectId: "swehw4",
    storageBucket: "swehw4.appspot.com",
    messagingSenderId: "1080437453033"
};
firebase.initializeApp(config);

let database = firebase.database();
//Global Data Structures======================================

//Keeps track user within the cache
let users;

//Load from FireBase flag
let loadFromFireBase = true;

//End of Data Structures======================================


//Global Functions============================================
//End of Global Functions=====================================

//Class Declarations==========================================

class User
{
    constructor(uName, uEmail)
    {
        this.username = uName;
        this.email = uEmail;
        this.friendUIDS = new Set();
        this.appointments = new Map();
    }

    getEmail()
    {
        return this.email;
    }

    getUserName()
    {
        return this.username;
    }

    addFriendID(friendID)
    {
        this.friendUIDS.add(friendID);
    }

    isFriend(friendID)
    {
        let fID = friendID.toLowerCase();
        for(let friend of this.friendUIDS)
        {
            if(friend === fID)
            {
                return true;
            }
        }
        return false;
    }

    setEmail(email)
    {
        this.email = email;
    }

    removeFriendID(friendID)
    {
        this.friendUIDS.delete(friendID);
    }

    getFriendUIDS()
    {
        return this.friendUIDS;
    }

    addAppointment(appointment)
    {
        // this.getAppointment(appointment.getDate())
        //     .then((retrieved)=>
        //     {
        //         if(force)
        //         {
        //             this.appointments.set(appointment.getDate(), appointment);
        //         }
        //         else
        //         {
        //             res.send("Appointment Already Alotted for That Time");
        //         }
        //     })
        //     .catch((message)=>
        //     {
        //         this.appointments.set(appointment.getDate(), appointment);
        //     })

        this.appointments.set(appointment.getDate(), appointment);
    }

    getAppointments()
    {
        return this.appointments;
    }

    toString()
    {
        let retval = `${this.username}\n${this.email}\n`;
        for(let friend of this.friendUIDS)
        {
            retval+=friend+"\n";
        }
        return retval;
    }


    getAppointment(date)
    {
        return new Promise((resolve, reject)=>
        {
            let retrieved = this.appointments.get(date);

            if(retrieved === undefined)
            {
                reject("Appointment Not Yet Created");
            }
            else
            {
                resolve(retrieved);
            }
        });
    }
}

class Appointment
{
    constructor(place, parties, date, description)
    {
        this.place = place;
        this.parties = parties;
        this.date = date;
        this.description = description;
    }

    getPlace()
    {
        return this.place;
    }

    setPlace(value)
    {
        this.place = value;
    }

    getParties()
    {
        return this.parties;
    }

    setParties(value)
    {
        this.parties = value;
    }

    getDate()
    {
        return this.date;
    }

    setDate(value)
    {
        this.date = value;
    }

    getDescription()
    {
        return this.description;
    }

    setDescription(value)
    {
        this.description = value;
    }

    getMonth()
    {
        return this.date.getMonth();
    }

    getYear()
    {
        return this.date.getFullYear();
    }

    getHour()
    {
        return this.date.getHour();
    }

}

router.route('/users/:userID/appointments/')
    .post((req, res)=>
    {
        getUserFromMap(req.params.userID)
            .then((user)=>
            {
                user.getAppointment(req.body.date, forced)
                    .then((appointment)=>
                    {
                        if(forced)
                        {
                            let newAppointment = new Appointment(req.body.place, req.body.parties, req.body.date, req.body.description);
                            user.addAppointment(newAppointment);
                        }
                        else
                        {
                            res.send("Cannot POST Appointment. Time Slot Already Taken.");
                        }
                    })
                    .catch((error)=>
                    {
                        let newAppointment = new Appointment(req.body.place, req.body.parties, req.body.date, req.body.description);
                        user.addAppointment(newAppointment);
                        res.send(error+"\nCreating New Appointment.";)
                    });
            })
            .catch((message)=>
            {
                res.send(message);
            });
    });

router.route('/users/')
    .get((req, res)=>
    {
        let returnString = "";
        for(let userObject of users.values())
        {
            returnString+=userObject.toString()+"=========================\n"
        }

        res.send(returnString);
    });

//=========================== Routing Simple Get and Delete ======================================
router.route('/users/:userID/')
    .get((req, res)=>
    {
        getUserFromMap(req.params.userID)
            .then((retrieved)=>
            {
                res.send(retrieved.toString());
            })
            .catch((error)=>
            {
                res.send(error);
            })
    })
    .delete((req, res)=>
    {
        getUserFromMap(req.params.userID)
            .then((retrieved)=>
            {
                users.delete(retrieved.getUserName().toLowerCase());
                res.send(`Successfully deleted ${retrieved.getUserName()}`);
                deleteUserFromDatabase(retrieved);
            })
            .catch((error)=>
            {
                res.send(error);
            });
    });

//============================== End of Simple Routing and Deleting ==============================

//============================== Routing with UserID and Email ===================================
router.route('/users/:userID/email')
    .put((req, res)=>
    {
        getUserFromMap(req.params.userID)
            .then((retrieved)=>
            {
                retrieved.setEmail(req.body.email);
                res.send("Successfully changed user's email\n"+retrieved.toString()+"\n");
                saveUserToDatabase(retrieved);
            })
            .catch((error)=>
            {
                res.send(error);
            });
    });

router.route('/users/:userID/')
    .post((req, res)=>
    {
        getUserFromMap(req.params.userID)
            .then((retrieved)=>
            {
                res.send(retrieved.getUserName()+" already exists. Please choose a different username.");
            })
            .catch((error)=>
            {
                let newUser = new User(req.params.userID, req.body.email);
                users.set(req.params.userID.toLowerCase(), newUser);
                saveUserToDatabase(newUser);
                res.send("Created new user successfully: " + newUser.toString());
            });
    });
//================================================================================================

router.route('/')
    .get((req, res)=>
    {
       res.send("This is the app's homescreen.\nPlease refer to Project Proposal document" +
           " for details about this app's endpoint services.");
    });


//Routing with userID, and friendID===============================================================
router.route('/users/:userID/friends/:friendID')
    .get((req, res)=>
    {
        getUserFromMap(req.params.userID)
            .then((retrieved)=>
            {
                if(retrieved.isFriend(req.params.friendID))
                {
                    getUserFromMap(req.params.friendID)
                        .then((friend)=>
                        {
                            res.send("Got the friend " + friend.toString());
                        })
                        .catch((error)=>
                        {
                            res.send("User has no friend with username " + req.params.friendID);
                        });
                }
                else
                {
                    res.send(req.params.friendID + " is not a friend of " + retrieved.getUserName());
                }
            })
            .catch((error)=>
            {
                res.send("There was an error " + error);
            });
    })
    .put((req, res)=>
    {
        getUserFromMap(req.params.userID)
            .then((retrieved)=>
            {
                getUserFromMap(req.params.friendID)
                    .then((friend)=>
                    {
                        retrieved.addFriendID(req.params.friendID);
                        saveUserToDatabase(retrieved);
                        res.send("Added " + friend.getUserName() + " to "+ retrieved.getUserName()+"'s friends list");
                    })
                    .catch((error)=>
                    {
                        res.send("Friend was not found in users list. " + error);
                    })
            })
            .catch((error)=>
            {
                res.send(error);
            });
    })
    .delete((req, res)=>
    {
        getUserFromMap(req.params.userID)
            .then((retrieved)=>
            {
                getUserFromMap(req.params.friendID)
                    .then((friend)=>
                    {
                        //need to verify if still in friend's list to prevent unnecessary delete calls
                        retrieved.removeFriendID(req.params.friendID);
                        res.send("Removed " + friend.getUserName() + " from "+ retrieved.getUserName()+"'s friends list");
                        saveUserToDatabase(retrieved);
                    })
                    .catch((error)=>
                    {
                        res.send("Friend was not found in users list. " + error);
                    })
            })
            .catch((error)=>
            {
                res.send(error);
            });
    });
//================================================================================================


function getUserFromMap(userID)
{
    return new Promise((resolve, reject)=>
    {
        let retrieved = users.get(userID.toLowerCase());

        if(retrieved === undefined)
        {
            reject("User Not Found");
        }
        else
        {
            resolve(retrieved);
        }
    });
}

function downloadFriends(user)
{
    let freindsRef = database.ref('friends').child(user.getUserName());

    freindsRef.once('value')
        .then((snapshot)=>
        {
            let friends = snapshot.val();

            if(friends !== null)
            {
                // console.log("These are the friends I downloaded: " + friends);
                for(let i in friends)
                {
                    // console.log("Friend: " + friends[i]);
                    user.addFriendID(friends[i]);
                }
            }
        });
}

function downloadDataFromFireBase()
{
    let reference = database.ref('users/');
    reference.once('value')
        .then((snapshot)=>
        {
            let data = snapshot.val();
            //console.log(data);
            users = new Map();

            let user;
            for(let element in data)
            {
                user = data[element];
                let newUser = new User(user.username, user.email);
                downloadFriends(newUser);
                //console.log(user);
                users.set(user.username, newUser);
            }
        })
        .catch((error)=>
        {
            console.log(error);
        });

}

function getGoing()
{
    if(loadFromFireBase)
    {
        downloadDataFromFireBase();
    }
    else
    {
        users = new Map();
        let newUser = new User("ssbb231", "jdboddenp@gmail.com");
        let friend = new User("jlopez", "jlopez@cs.gmu.edu");
        newUser.addFriendID("jlopez");
        users.set("ssbb231", newUser);
        users.set(friend.username.toLowerCase(), friend);
    }

    app.use(jsonParser);
    app.use('/', router);
    app.listen(port);
}

function saveUserToDatabase(data)
{
    database.ref('users/' + data.getUserName()).set(data);
    //this part isn't working. Set is somehow not put into the tree.
    addFriendListToDatabase(data);
}

function addFriendListToDatabase(data)
{
    let node = database.ref().child('friends').child(data.getUserName());
    node.remove();

    for(let friend of data.getFriendUIDS())
    {
        console.log("RETRIEVED THIS INFO: " + friend);
        database.ref().child('friends').child(data.getUserName()).push(friend);
    }

    console.log("Added all friends==================");
}

function deleteUserFromDatabase(user)
{
    database.ref('users/').child(user.getUserName()).remove();
}

getGoing();