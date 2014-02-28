
angular.module('askApp').controller('DashEcosystemsCtrl', function($scope, $http, $routeParams, $location, surveyFactory, dashData, chartUtils) {
    
    $scope.activePage = 'ecosystems';
    $scope.filters = {};
    $scope.filtersJson = '';


    function filtersChanged(newFilters) {
        var filters = [],
            newFiltersJson = dashData.formatFilters(newFilters);

        if ($scope.filtersJson !== newFiltersJson) {
            // Update UI.
            $scope.filtersJson = newFiltersJson;
            buildCharts();
        }
    }


    function buildCharts() {
        var onSuccess = function (chartConfig) {
            $scope.ecosystem_project_counts = chartConfig;
        };
        chartUtils.buildStackedBarChart($routeParams.surveySlug, 'ecosystem-features', $scope.filtersJson, onSuccess, {
            title: "Reported Ecosystem Features",
            yLabel: "Number of Projects",
        });
    }


    $scope.$watch('filters', function (newValue) {
        if (newValue) {
            filtersChanged(newValue);
        }
    }, true);


    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });

});
