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
        var url = "/reports/distribution/" + $routeParams.surveySlug + "/ecosystem-features";

        $http.get(url).success(function(data) {
            $scope.ecosystems = _.pluck(data.answer_domain, "answer_text");
        });
    }

    function build_ecosystem_project_counts_url ($scope) {
        // var url = '/reports/ecosystem-project-counts/' + $routeParams.surveySlug;
        var url = "/reports/distribution/" + $routeParams.surveySlug + "/ecosystem-features";

        if ($scope.market) {
            url += '&market=' + $scope.market;
        }
        
        return url;
    }

    function build_ecosystem_project_counts() {
        var url = build_ecosystem_project_counts_url($scope);

        $http.get(url).success(function(data) {
            $scope.ecosystem_project_counts = {
                labels: _.pluck(data.answer_domain, "answer_text"),
                displayTitle: false,
                yLabel: "Number of Projects",
                title: "Reported Ecosystem Features",
                categories: [""],
                type: "stacked-column",
                data: _.pluck(data.answer_domain, "surveys"),
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + ".csv"),
                unit: "projects"
            }
        });
    }

    function filters_changed(surveySlug) {
        // reportsCommon.getRespondents(null, $scope);
        build_ecosystem_project_counts();
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


    filters_changed('');

});
