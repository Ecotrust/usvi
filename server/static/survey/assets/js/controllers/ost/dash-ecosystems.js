
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
        var options, onFail, onSuccess;
        onFail = function (data) {
            if (data.message && data.message.length > 0) {
                $scope.ecosystemProjectsChart = { message: data.message };
            } else {
                $scope.ecosystemProjectsChart = { message: "Failed to retrieve data." };
            }
        };
        onSuccess = function (chartConfig) {
            $scope.ecosystemProjectsChart = chartConfig;
        };
        options = {
            title: "Reported Ecosystem Features",
            yLabel: "Number of Projects"
        };
        chartUtils.buildStackedBarChart($routeParams.surveySlug, 'ecosystem-features',
            $scope.filtersJson, options, onSuccess, onFail);
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
