
angular.module('askApp')
  .controller('SplashCtrl', function ($scope, $location, $http) {
  	$scope.version = app.version;
  	$scope.stage = app.stage;
<<<<<<< HEAD
  	$('.splash').height($('body').height()).backstretch(app.viewPath + 'assets/img/splash.png');
=======
  	// $('.splash').height($('body').height()).backstretch('assets/img/splash.png');
>>>>>>> gs/master
  });