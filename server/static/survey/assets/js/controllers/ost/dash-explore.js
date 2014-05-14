
angular.module('askApp').controller('DashExploreCtrl', function($scope, $http, $routeParams, $location, surveyFactory, dashData, chartUtils) {
    
    $scope.activePage = 'explore';
    $scope.charts = {};
    $scope.filtersJson = '';


    function buildChart(questionSlug, options) {
        var options, onFail, onSuccess;
        onFail = function (data) {
            if (data.message && data.message.length > 0) {
                $scope.charts[questionSlug] = { message: data.message };
            } else {
                $scope.charts[questionSlug] = { message: "Failed to retrieve data." };
            }
        };
        onSuccess = function (chartConfig) {
            $scope.charts[questionSlug] = chartConfig;
        };
        chartUtils.buildStackedBarChart($routeParams.surveySlug, questionSlug,
            $scope.filtersJson, options, onSuccess, onFail);
    }


    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });


    buildChart('proj-data-years', {title: "Project Duration", yLabel: "Number of Projects"});
    buildChart('proj-data-frequency', {title: "Project Frequency", yLabel: "Number of Projects"});
});
