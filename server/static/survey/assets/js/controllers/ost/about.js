
angular.module('askApp')
  .controller('AboutCtrl', ['$scope', '$window', function AboutCtrl($scope, $window) {

    $scope.path = 'about';

    $scope.showTopMenu = app.user ? true : false;

    $scope.goBack = function () {
        $window.history.back();
    };

  }]);
