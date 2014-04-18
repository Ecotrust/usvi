
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
                
                var removeHtml = function (html) {
                    var regex = /(<([^>]+)>)/ig,
                        noHtml = html.replace(regex, "");
                    return noHtml;
                };

                var onFail = function (data) { 
                    debugger; 
                };

                var onSuccess = function (data) {
                    // Grab the answer_text value for each item, sort 
                    // them all and remove duplicates.
                    var options = [],
                        vals = _.pluck(data.answer_domain, "answer_text");
                    // Remove 'other' answers.
                    vals = _.filter(vals, function(val){ return val.substring(0,7) !== '[Other]'; });
                    // Sort, comparing by the value itself.
                    vals = _.sortBy(vals, function(item){
                        return item;
                    });
                    // Remove duplicates.
                    vals = _.uniq(vals, true);


                    // Provide a displayLabel verstion that doesn't have
                    // any html formatting.
                    angular.forEach(vals, function(val) {
                        options.push({
                            displayLabel: removeHtml(val),
                            value: val
                        });
                    });

                    scope.filterOptions = options;
                };

                dashData.getDistribution(scope.surveySlug, scope.questionSlug,
                    '' /*no filter*/, onSuccess, onFail);
            }


            scope.selectionChanged = function (value) {
                scope.selectedValues = scope.model.selectedValuesInternal;
            };


            setFilterOptions();
        }
    }
});
