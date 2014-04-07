//'use strict';

angular.module('askApp')
  .controller('SettingsCtrl', function ($scope, $location, $http, storage, $timeout) {

    if (app.user) {
        $scope.user = app.user;
    } else {
        $location.path('/');
    }
    $scope.server = app.server;

    function flashMessage(message) {
        $scope.message = message;
        $timeout(function() {
            $scope.message = null;
        }, 3000)
    }

    $scope.path = 'sett';
    $scope.clearCache = function () {
        storage.clearCache();
        window.location.reload();
    }

    $scope.updatePassword = function (passwords) {
        var url = app.server + "/account/updatePassword";
        $scope.showError = false;

        //clean passwords
        _.each(passwords, function(val, key){
            passwords[key] = ''+val;
        });

        $http.post(url, {username: app.user.username, passwords: passwords})
            .success(function (data) {
                $scope.passwords = null;
                $scope.changingPassword = false;
                flashMessage("Your password has been changed");
                storage.saveState(app);
            })
            .error(function (data) {
              $scope.showError = data;
            });
    }

    $scope.updateUser = function (user) {
        var url = app.server + "/account/updateUser";

        $http.post(url, user)
            .success(function (data) {
                app.user = data.user;
                storage.saveState();
                $scope.editProfile = false;
                flashMessage("Changes saved")
            })
            .error(function (data) {
              $scope.showError = data;
            });
    };

  });
