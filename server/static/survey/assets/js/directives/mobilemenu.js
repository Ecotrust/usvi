
angular.module('askApp')
    .directive('mobilemenu', function() {

    return {
        templateUrl: app.viewPath + 'views/mobileMenu.html',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: false,
        link: function (scope, element, attrs) {
        }
    }
});