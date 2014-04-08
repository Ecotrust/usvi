angular.module('askApp')
    .controller('LandingDashCtrl', function($scope, $http, $routeParams, $location){
         $scope.user = app.user;

        if ($scope.user.is_staff){
            $location.path("/acl-progress");
        }
    });