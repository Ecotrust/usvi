//'use strict';
 
angular.module('askApp').controller('DashEcosystemsCtrl', function($scope, $http, $routeParams, $location, surveyFactory) {
    
    $scope.activePage = 'ecosystems';

    function getQuestionByUri (uri) {
        return _.findWhere($scope.survey.questions, {'resource_uri': uri});
    }

    function getQuestionBySlug (slug) {
        return _.findWhere($scope.survey.questions, {'slug': slug});
    }

    function setup_ecosystems_dropdown ($scope) {
        var url = "/report/distribution/" + $routeParams.surveySlug + "/ecosystem-features";

        $http.get(url).success(function(data) {
            $scope.ecosystems = _.pluck(data.answer_domain, "answer");
        });
    }

    function build_survey_stats_url ($scope) {
        var start_date = new Date($scope.filter.startDate).toString('yyyy-MM-dd');
        var end_date = new Date($scope.filter.endDate).add(1).day().toString('yyyy-MM-dd');
        var url = '/report/surveyor-stats/' + $routeParams.surveySlug + '/' + $scope.surveyorTimeFilter;
        url += '?start_date=' + start_date;
        url += '&end_date=' + end_date;

        if ($scope.market) {
            url += '&market=' + $scope.market;
        }

        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }
        return url;
    }

    function build_survey_totals() {
        var url = build_survey_stats_url($scope);

        $http.get(url).success(function(data) {
            $scope.surveyor_by_time = {
                yLabel: "Surveys Collected",
                title: "Surveys Collected by Date",
                displayTitle: false,
                raw_data: data.graph_data,
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + '.csv'),
                unit: "surveys"
            }
            // map reduuuuuuce
            var bar_data = _.map(data.graph_data,
                function (x) {
                    return _.reduce(x.data, function (attr, val) { return attr + val[1]; }, 0);
                }
            );
            $scope.surveyor_total = {
                labels: _.pluck(data.graph_data, 'name'),
                displayTitle: false,
                yLabel: "Surveys Collected",
                title: "Total Surveys Collected by Surveyor",
                categories: [""],
                type: "bar",
                data: bar_data,
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + ".csv"),
                unit: "surveys"
            }
        });
    }

    function filters_changed(surveySlug) {
        // reportsCommon.getRespondents(null, $scope);
        // build_survey_totals();
    }
            
    $scope.$watch('filter', function (newValue) {
        if (newValue) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);


    if (_.isEmpty($location.search())) {
        $scope.filter = {
            "area": "stcroix"
        };
    } else {
        $scope.filter = $location.search();
    }

    // $http.get('/api/v1/annualcatchlimit/?limit=0&format=json').success(function (data) {
    //     $scope.acls = data.objects;
    //     getAclReport();

    //     $scope.$watch('filter', function (newFilter) {
    //         $location.search($scope.filter);
    //         $scope.area = $scope.areaMapping[$scope.filter.area];
    //         getAclReport();
    //     }, true);
    // });



    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
        setup_ecosystems_dropdown($scope);
        $scope.filter = {

        }   
        _.each($scope.survey.questions, function (question) {
            // save a reference to filter questions which are specified by uri
            question.filters = {};
            if (question.visualize && question.filter_questions) {
                question.filterQuestions = [];
                _.each(question.filter_questions, function (filterQuestion) {
                    question.filterQuestions.push($scope.getQuestionByUri(filterQuestion));
                });

            }
        });
    });


    


});
