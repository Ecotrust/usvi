//'use strict';

angular.module('askApp')
    .controller('SurveyListMenuCtrl', function($scope, $http, $routeParams, $location) {
    	$scope.activePage = 'reports';
        $http.get(app.server + '/api/v1/surveyreport/?format=json').success(function(data) {
            $scope.surveys = data.objects;
        })
    });