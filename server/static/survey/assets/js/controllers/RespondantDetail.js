//'use strict';

angular.module('askApp')
    .controller('RespondantDetailCtrl', function($scope, $routeParams, $http) {

    $http.get('/api/v1/dashrespondant/'  + $routeParams.uuidSlug + '/?format=json&survey__slug=' + $routeParams.surveySlug).success(function(data) {
        
        $scope.respondent = data;
        $http.get('/api/v1/response?format=json&limit=0&respondant__uuid=' + $routeParams.uuidSlug).success(function (data) {
            var responses = data.objects;
            _.each(responses, function (response) {
                response.answer_parsed = JSON.parse(response.answer_raw);
            });
            $scope.respondent.responses = responses;
        });
    });
        
    
    $scope.uuid = $routeParams.uuidSlug;
    $scope.surveySlug = $routeParams.surveySlug;

    $scope.map = {
        center: {
            lat: 47,
            lng: -124
        },
        zoom: 7
    }

    $scope.getResponseBySlug = function(slug) {
        var question = _.filter($scope.response.responses, function(item) {
            return item.question.slug === slug;
        });

        return _.first(question);
    }
});
