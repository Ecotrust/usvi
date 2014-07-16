
angular.module('askApp').directive('fullHeight', function ($window) {
    return function (scope, element) {
        var w = angular.element($window);

        scope.getWindowDimensions = function () {
            return { 'h': w.height(), 'w': w.width() };
        };

        scope.get_new_height = function(){
            return angular.element(".container").outerHeight();
        };

        scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
            scope.windowHeight = newValue.h;
            scope.windowWidth = newValue.w;

            scope.style = function () {
                return { 
                    'height': scope.get_new_height() + 'px'
                };
            };

        }, true);

        w.bind('resize', function () {
            scope.$apply();
        });
    }
})