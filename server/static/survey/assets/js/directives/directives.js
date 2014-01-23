
angular.module('askApp')
    .directive('password', function() {

    return {
        templateUrl: app.viewPath + 'views/password.html',
        restrict: 'EA',
        transclude: true,
        replace: true,
        scope: {
            passwordText: "=passwordText",
            placeholderText: "=placeholderText"
        },
        link: function (scope, element, attrs) {
            scope.visible = false;
            scope.element = element;
            
            scope.toggleVisible = function () {
                scope.visible = ! scope.visible;

                
                
            }
        }
    }
});

angular.module('askApp')
    .directive('progress', function() {

    return {
        templateUrl: app.viewPath + 'views/progress.html',
        restrict: 'EA',
        transclude: true,
        replace: true,
        scope: {
            value: "=value",
            max: "=max"
        },
        link: function (scope, element, attrs) {
            scope.percent = (scope.value/scope.max) * 100;
        }
    }
});

angular.module('askApp')
    .directive('speciesSelect', function($http) {

    return {
        template: '<input type="text" class="form-control" placeholder="Species" ng-model="species.name">',
        scope: {
            species: "=species"
        },
        transclude: true,
        link: function (scope, element, attrs) {
            var cache = {}, index = {};
            element.find('input').autocomplete({
                minLength: 2,
                select: function (event, ui) {
                    scope.$apply(function (s) {
                        s.species = index[ui.item.label];
                    });
                },
                source: function (request, response) {
                    var term = request.term;
                    if ( term in cache ) {
                      response(cache[term]);
                      return;
                    }
                    $http.get("/api/v1/species/?format=json").success(function(data) {
                        var results = [];
                        _.each(data.objects, function (item) {
                            var label = item.name + ' (' + item.code + ')'
                            results.push({
                                value: label,
                                label: label
                            });
                            index[label] = item;
                        });
                        cache[ term ] = results;
                        response(results);
                    });
                }
            });
        }
    }
});