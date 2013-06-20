//'use strict';

angular.module('askApp')
  .controller('CompleteCtrl', function ($scope, $routeParams, $http) {
    var url = '/respond/complete/' + [$routeParams.surveySlug, $routeParams.uuidSlug].join('/');
    
    if ($routeParams.action === 'terminate' && $routeParams.questionSlug) {
        url = [url, 'terminate', $routeParams.questionSlug].join('/');
    }


    $http.post(url).success(function (data) {
        app.data.state = $routeParams.action;
    });
    
    if (app.data) {
        $scope.responses =app.data.responses;    
        app.data.responses = [];
    }
    $scope.completeView = '/static/survey/survey-pages/' + $routeParams.surveySlug + '/complete.html';
  });
