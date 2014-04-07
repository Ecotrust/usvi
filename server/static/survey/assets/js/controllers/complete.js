//'use strict';

angular.module('askApp')
  .controller('CompleteCtrl', function ($scope, $routeParams, $http, $location, survey, history, storage) {
    var url = '/respond/complete/' + [$routeParams.surveySlug, $routeParams.uuidSlug].join('/');
    $http.defaults.headers.post['Content-Type'] = 'application/json';

   
    if (app.user) {
        $scope.user = app.user;
    } else {
        $scope.user = false;
    }
    $scope.path = false;

    
    if ($routeParams.action === 'terminate' && $routeParams.questionSlug) {
        url = [url, 'terminate', $routeParams.questionSlug].join('/');
    }
    if ($routeParams.action === 'done-impersonating') {
        $scope.done_impersonating = true;
    } else {
        if (app.surveys) {
            $scope.surveys = app.surveys;
        }
        $scope.survey = _.findWhere($scope.surveys, { slug: $routeParams.surveySlug});
        survey.initializeSurvey($scope.survey);

        if (app.offline) {
            app.respondents[$routeParams.uuidSlug].complete = true;
            app.respondents[$routeParams.uuidSlug].status = 'complete';
            delete app.user.resumePath;
            app.message = "You have completed a catch report.";

            storage.saveState(app);       
        } else {
            $http.post(url).success(function (data) {
                app.data.state = $routeParams.action;
            });    
        }

        $scope.respondent = app.respondents[$routeParams.uuidSlug];
        
        
        if (app.data) {
            $scope.responses =app.data.responses;    
            app.data.responses = [];
        }
        if ($scope.respondent.survey.match(/puerto-rico/)) {
            $scope.groups = _.groupBy($scope.getAnswer('fish-species-puerto-rico'), 'groupName');
            $scope.fw = _.indexBy($scope.getAnswer('fish-weight-price-puerto-rico'), 'text');
            console.log($scope.fw);
        }

    }

    $scope.completeView = '/static/survey/survey-pages/' + $routeParams.surveySlug + '/complete.html';

    $scope.surveyProgress = 100;

    $scope.closeWindow = function () {
        window.close();
    };

    $scope.skipBack = function () {
        $location.path($scope.respondent.resumePath.replace('#', ''));
    };

    $scope.getTitle = function() {
        return history.getTitle($scope.respondent);
    };

    $scope.getAnswer = function(questionSlug) {
        return history.getAnswer(questionSlug, $scope.respondent);
    };
    
    $scope.gearTypeIncludes = function(type) {
        return history.gearTypeIncludes(type, $scope.respondent);
    };

    $scope.trapTypeIncludes = function(type) {
        return history.trapTypeIncludes(type, $scope.respondent);
    };


    $scope.submitReport = function () {
        $scope.working = true;
        var newRespondent = app.respondents[$routeParams.uuidSlug];
        
        delete app.user.resumePath;
        survey.submitSurvey(newRespondent, $scope.survey).success(function () {
            delete app.respondents[$routeParams.uuidSlug]
            app.message = "Your catch report was submitted successfully."
            storage.saveState(app);
            $location.path('/main');
            $scope.working = true;
        }).error(function () {
            app.message = "Your catch report was saved and can be submitted later."
            storage.saveState(app);
            $location.path('/main');
        });

    };

    $scope.continueOffline = function () {
        app.message = "Your catch report was saved and can be submitted later."
        delete app.user.resumePath;
        storage.saveState(app);
        $location.path('/main');
    }   

    
  });
