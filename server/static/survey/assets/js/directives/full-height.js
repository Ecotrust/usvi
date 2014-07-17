
angular.module('askApp').directive('fullHeight', function ($window) {
    return function (scope, element) {
        var w = angular.element($window);

        scope.getWindowDimensions = function () {
            return { 'h': w.height(), 'w': w.width() };
        };

        scope.get_new_height = function(){
            var body_height = angular.element(".container").outerHeight();
            var window_height = angular.element($window).outerHeight();

            out = Math.max(body_height, window_height);
            return out;
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

