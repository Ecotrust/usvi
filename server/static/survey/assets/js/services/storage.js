angular.module('askApp').service('storage', function() {

    var saveState = function (state) {
        localStorage.setItem('hapifis-' + state.user.username, JSON.stringify(state));
        localStorage.setItem('hapifis', JSON.stringify({ currentUser: state.user.username }));
    };

    var getState = function (username) {
        return JSON.parse(localStorage.getItem('hapifis-' + username));
    };

    var clearCache = function () {
        var keys = Object.keys(localStorage);
        _.each(keys, function (key) {
            if (/^hapifi/.test(key)) {
                localStorage.removeItem(key);
            }
        });
    };

    var getCurrentUser = function () {
        return JSON.parse(localStorage.getItem('hapifis')).currentUser;
    };

    var getStateForUser = function (username) {
        return JSON.parse(localStorage.getItem('hapifis-' + username));
    };

     var cleanUserObject = function(user){
        // Mainly used to parse the password to a string before sending to the server
        var password = user.password;
        user.password = ''+password;
        return user;
    };

    return {
        saveState: saveState,
        getState: getState,
        clearCache: clearCache,
        getCurrentUser: getCurrentUser,
        getStateForUser: getStateForUser,
        cleanUserObject : cleanUserObject,

    };
});