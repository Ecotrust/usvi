
angular.module('askApp')
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.headers.patch = {
            'Content-Type': 'application/json;charset=utf-8'
        }
    }])
    .controller('RespondantListCtrl', function($scope, $http, $routeParams, $location, history, surveyFactory) {

    $scope.page_title = "Search Results"
    $scope.user = app.user || {};
    $scope.searchTerm = $location.search().q;
    $scope.resource = '/api/v1/dashrespondant/';
    
    $scope.survey = {};
    $scope.survey.slug = $routeParams.survey_slug;    

    $scope.respondents_per_page = 10;
    $scope.busy = true;
    $scope.viewPath = app.server + '/static/survey/';
    $scope.activePage = 'responses';

    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });

    if ($scope.searchTerm){
        var url = '/api/v1/dashrespondant/search/?format=json&limit='+$scope.respondents_per_page+'&q=' + $scope.searchTerm;
    } else {
        var url = '/api/v1/dashrespondant/?format=json&limit='+$scope.respondents_per_page;
    }

    $http.get(url).success(function(data) {
        $scope.respondents = data.objects;
        $scope.meta = data.meta;
        $scope.responsesShown = $scope.respondents.length;
        $scope.busy = false;
    });



    $scope.OLDshowRespondent = function (respondent) {
        var path = ['/RespondantDetail', $routeParams.surveySlug, respondent.uuid].join('/');
        $location.path(path);
    };


    $scope.getAnswer = function(questionSlug, respondent) {
        return history.getAnswer(questionSlug, respondent);

    };


    $scope.showNext20 = function(surveyFilter) {
        $scope.gettingNext20 = true;
        $http.get($scope.meta.next)
            .success(function (data, callback) {
                _.each(data.objects, function(respondent, index) {
                    $scope.respondents.push(respondent);
                });
                $scope.gettingNext20 = false;
                $scope.meta = data.meta;
            }).error(function (data) {
                console.log(data);
            }); 
    };

    
    $scope.getTitle = function() {
        return history.getTitle($scope.respondent);
    };


});
