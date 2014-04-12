(function(){
     'use strict';
    angular.module('askApp')
        .controller('AccountsCtrl', function($scope, $routeParams, $http, api) {
            if ($routeParams.username && $routeParams.username.length > 0){
                var username = $routeParams.username;
                api.fetch("user", {username:username})
                    .success(function(data){
                        $scope.account = data.objects[0];
                    });
            }
        });
    }
)();
