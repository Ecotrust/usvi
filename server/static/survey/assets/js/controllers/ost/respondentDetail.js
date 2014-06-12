//'use strict';

angular.module('askApp')
    .controller('RespondentDetailCtrl', function($scope, $http, $routeParams, $location, survey, history) {

    
    $scope.viewPath = app.viewPath;


    $scope.getRespondent = function (respondent_uuid, survey_slug, onSuccess) {
        var url = app.server 
              + '/api/v1/reportrespondantdetails/'
              + respondent_uuid 
              + '/?format=json'
              + '&survey__slug=' + survey_slug;

        return $http.get(url)
            .success(function (data) {
                onSuccess(data);
            }).error(function (err) {
                console.log(JSON.stringify(err));
                debugger;
                $scope.showErrorMessage = true;
            });
    };
        

    $scope.parseResponses = function (respondent) {
        _.each(respondent.responses, function(response, index) {
            try {
                response.answer = JSON.parse(response.answer_raw);
            } catch(e) {
                console.log('failed to parse answer_raw');
                response.answer = response.answer;
            }
            response.question = response.question.slug;
        });
    };


    $scope.getAnswer = function(questionSlug) {
        console.log("respondent" );
        console.log($scope.respondent);
        console.log("Looking for answer to "+questionSlug)

        return history.getAnswer(questionSlug, $scope.respondent);
    };


    $scope.getTitle = function() {
        return history.getTitle($scope.respondent);
    };


    $scope.answerContains = function (questionSlug, val) {
        return $scope.getAnswer(questionSlug).indexOf(val) > -1;
    };


    $scope.resumeSurvey = function (respondent) {
        $http.get(app.server + '/api/v1/respondant/' + respondent.uuid + '/?format=json').success(function(data) {
            survey.initializeSurvey(data.survey, data.survey.pages);
            survey.resume(respondent);
        });
    };

    $scope.deleteRespondent = function (respondent) {
        $http.get(app.server + '/respond/delete-incomplete/' + respondent.uuid).success(function(data) {
            var path = respondent.complete ? '/completes' : '/incompletes';
            $location.path(path);
            $scope.showDeleteErrorMessage = false;
        }).error(function (data) {
            $scope.showDeleteErrorMessage = true;
        });
    };

    $scope.getRespondent($routeParams.uuidSlug, $routeParams.survey_slug, function (respondent) {
        $scope.respondent = respondent;
        $scope.parseResponses(respondent);
        $scope.backPath = respondent.complete ? '/completes' : '/incompletes';
        $scope.showContent = true;
    });


}).directive('answersPanel', function(history) {
    return {
        templateUrl: '/static/survey/views/ost/answers/answersPanel.html',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            title: '=',
            htmlContent: '=',
            respondent: '='
        },
        link: function postLink(scope, element, attrs) {
            scope.open = false;

            scope.getAnswer = function(questionSlug) {
                return history.getAnswer(questionSlug, scope.respondent);
            };
        }
    }
});
