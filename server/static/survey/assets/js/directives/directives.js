
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
            console.log(scope.percent);
        }
    }
});

/**
 * This directive only applies to <select> elements. It applies the 
 * select2 component.
 */
angular.module('askApp')
    .directive('select2', ['$timeout', function($timeout) {

    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            $timeout(function () {
                // The placeholder text was not being displayed without doing 
                // this in a a timeout().
                element.select2();
            });
        }
    }
}]);

/**
 * This directive applies the monthpicker component to <input> elements.
 */
angular.module('askApp')
    .directive('monthpicker', ['$timeout', function($timeout) {

    return {
        restrict: 'A',
        //restrict: 'EA',
        // scope: {
        //     valueasdf: "="
        // },
        link: function (scope, element, attrs) {
            // var options = { 
            //     ShowIcon: false,
            //     OnAfterChooseMonth: function() {
            //         scope.valueasdf = element.val();
            //         //scope.$apply(function () {
            //         //     console.log(element.val());
            //         // });
            //     }
            // }; 
            var options = { 
                ShowIcon: false
            }; 
            $timeout(function () {
                element.MonthPicker(options);
            });
        }
    }
}]);    



angular.module('askApp')
    .directive('respondentsearch', function(surveyFactory) {

    return {
        restrict: 'EA',
        templateUrl : app.viewPath +'views/ost/searchbox.html',
        scope: {},

        link: function (scope, element, attrs) {
            scope.surveyFactory = surveyFactory;
            scope.element = element
            
            // Bind enter key
            element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.search();
                });
                event.preventDefault();
            }
        });

            scope.search = function(){
                console.log('WTF');
                var val = element.find("input").val();
                surveyFactory.searchRespondants(val)
            };

        }
    };
});




angular.module('askApp')
    .directive('respondentstable', ['$http', function(http) {

    return {
        restrict: 'EA',
        templateUrl : app.viewPath +'views/ost/dash-respondents-table.html',
        scope: {respondents: '=',
                resource:'=',
            },

        link: function (scope, element, attrs) {
            scope.meta = null;
            scope.http = http;
            scope.showRespondent = function(uuid){
                console.log('WTF');
                console.log(uuid);
            };

            // Paginated respondent table
            scope.goToPage = function (page) {
                var meta = scope.meta || {}
                    , limit = 8
                    , offset = limit * (page - 1)
                    , url = [
                        scope.resource + '?format=json&limit='+limit
                        , '&offset='+offset
                      ].join('')
                    ;
                scope.http.get(url).success(function (data) {
                    scope.respondents = data.objects;
                    scope.meta = data.meta;
                    scope.currentPage = page;
                });
            };
            
            // Only load first page if not results from a text search
            if (scope.resource === '/api/v1/completerespondant/'){
                scope.goToPage(1);
            }

        }
    };
}]);

