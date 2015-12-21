//'use strict';

angular.module('askApp')
    .controller('SurveyListCtrl', function($scope, $http, $routeParams, $location, $timeout, storage) {

    $scope.path = $location.path().slice(1,5);
    $scope.loaded=false;

    $scope.useSurveys = function (surveys) {
        console.log(_.pluck(surveys, 'slug'));
        console.log(app.user.tags);
        $scope.surveys = surveys;
        _.each($scope.surveys, function (survey) {
            survey.updated_at = new Date();
        });
        app.surveys = $scope.surveys;
        storage.saveState(app);
        $scope.hideSurveys = false;
        $scope.loaded = true;
    }
    $scope.showUpdateSurveys = true;
    $scope.updateSurveys = function () {
        $scope.hideSurveys = true;

        $http.get(app.server + '/api/v1/survey/?format=json').success(function(data) {
            $scope.useSurveys(data.objects);
            app.refreshSurveys = false;
        }).error(function (data, status) {
            $http.get('assets/surveys.json').success(function(data) {
                $scope.useSurveys(data.objects);
            });
        });

    }

    if (app.user) {
        $scope.user = app.user;
    } else {
        $location.path('/');
    }
    if (! app.surveys || app.surveys.length === 0 || app.refreshSurveys) {
        $scope.updateSurveys();
    } else {
        $scope.surveys = app.surveys;
    }
    $timeout(function () {
        $(':active').blur();
    });

});