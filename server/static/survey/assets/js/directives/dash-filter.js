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
            selectedValues: "="
        },

        link: function postLink(scope, element, attrs) {

            scope.model = {};


            function setFilterOptions () {
                var onFail = function () { debugger; };

                var onSuccess = function (data) {
                    scope.filterOptions = _.pluck(data.answer_domain, "answer_text");
                };

                dashData.getDistribution(scope.surveySlug, scope.questionSlug, '' /*no filter*/, onSuccess, onFail);
            }


            scope.selectionChanged = function (value) {
                scope.selectedValues = scope.model.selectedValuesInternal;
            };


            setFilterOptions();
        }
    }
});

