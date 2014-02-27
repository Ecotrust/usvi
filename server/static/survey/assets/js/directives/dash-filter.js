angular.module('askApp')
    .directive('dashFilter', function($http, dashData) {
    return {
        templateUrl: '/static/survey/views/dash-filter.html',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            placeholderText: "=",
            allowMultiSelect: "=",
            surveySlug: "=",
            questionSlug: "=",
            selectedValuesJson: "="
        },

        link: function postLink(scope, element, attrs) {

            function setFilterOptions () {
                var onSuccess = function (data) {
                    scope.filterOptions = _.pluck(data.answer_domain, "answer_text");
                };
                var onFail = function () { debugger; };

                dashData.getDistribution(scope.surveySlug, scope.questionSlug, '' /*no filter*/, onSuccess, onFail);
            }
            
            setFilterOptions();

            scope.$watch('selectedValuesInternal', function (newFilter) {
                // Format the new filter value and present it to this 
                // directive's public variable.
                var filter = [];
                
                _.each(newFilter, function (v, k) {
                    var thisFilter = {};
                    
                    if (v.length) {
                        thisFilter[k] = v;
                        filter.push(thisFilter);
                    }
                });
                
                scope.selectedValuesJson = JSON.stringify(filter);
            }, true);

        }
    }
});