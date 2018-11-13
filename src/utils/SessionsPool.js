const uuid = require('uuid/v4');
//sessions
module.exports = class SessionsPool {
    constructor(sessions) {
        this.sessions = {};
        if (sessions) {
            this.sessions = sessions;
        };
        this.setNewUserSession = this.setNewUserSession.bind(this);
        this.getUserBySession = this.getUserBySession.bind(this);
        this.getSessionByUser = this.getSessionByUser.bind(this);
        this.removeSession = this.removeSession.bind(this);
    }
    setNewUserSession(userid) {
        let existingSessionid = this.getSessionByUser(userid);
        if (existingSessionid)
            this.removeSession(existingSessionid);
        let id = uuid();
        this.sessions[id] = userid;
        return id;
    };
    getUserBySession(sessionid) {
        return this.sessions[sessionid];
    }
    getSessionByUser(userid) {
        for (var key in this.sessions)
            if (this.sessions[key] == userid) return key;
        return false;
    };
    removeSession(sessionid) {
        delete this.sessions[sessionid];
    };
}