
angular.module('askApp')
  .controller('SplashCtrl', function ($scope, $location, $http) {
    if (app.user) {
        $location.path('/main');
    }
  	$scope.version = app.version;
  	$scope.stage = app.stage;
  	$('.splash').height($('body').height()).backstretch(app.viewPath + 'assets/img/splash.png');
});