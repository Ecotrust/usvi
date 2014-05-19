
angular.module('askApp').controller('DashExploreCtrl', function($scope, $http, $routeParams, $location, surveyFactory, dashData, chartUtils) {
    
    $scope.activePage = 'explore';
    $scope.charts = {};
    $scope.filtersJson = '';

    $scope.downloadPng = function (svgContainerSelector) {
        var svg = $(svgContainerSelector).html().trim(),
            width = parseInt(svg.match(/width="([0-9]+)"/)[1]),
            height = parseInt(svg.match(/height="([0-9]+)"/)[1]),
            canvas = document.createElement('canvas');
        
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);

        if (canvas.getContext && canvas.getContext('2d')) {

            canvg(canvas, svg, {ignoreAnimation: true, ignoreAnimation: true, });

            var image = canvas.toDataURL("image/png")
                .replace("image/png", "image/octet-stream");

            window.location.href = image;

        } else {
            alert ("Your browser doesn't support this feature, please use a modern browser");
        }
    };

    $scope.xFunction = function(){
        return function(d) {
            return d.answer;
        };
    }
    
    $scope.yFunction = function(){
        return function(d){
            return +d.surveys;
        };
    }

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

    function setPieChartData (questionSlug) {
        groupOthers = function (answer_domain) {
            // Put all [Other] answers into a single group.
            var othersGroup = {answer: 'Other', surveys: 0}
            _.each(answer_domain, function (grouping, i) {
                if (grouping.answer.substr(0,7) == '[Other]') {
                    othersGroup.surveys++;
                    answer_domain[i].surveys = 0;
                }
            });
            if (othersGroup.surveys > 0) {
                answer_domain.push(othersGroup);
            }
            return answer_domain;
        };
        onFail = function (data) {
            debugger;
        };
        onSuccess = function (data) {
            data.answer_domain = groupOthers(data.answer_domain);
            $scope.charts[questionSlug] = data;
        };
        dashData.getDistribution($routeParams.surveySlug, questionSlug, 
            $scope.filtersJson, onSuccess, onFail);
    }

    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });

    _.each(['org-type', 'proj-num-people'], function (questionSlug) {
        setPieChartData(questionSlug);
    });

    buildChart('proj-data-years', {title: "Project Duration", yLabel: "Number of Projects"});
    buildChart('proj-data-frequency', {title: "Project Frequency", yLabel: "Number of Projects"});
});
