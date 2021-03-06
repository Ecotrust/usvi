//'use strict';

angular.module('askApp')
    .controller('RespondantDetailCtrl', function($scope, $routeParams, $http) {
    $scope.user = app.user;
    $http.get('/api/v1/dashrespondant/'  + $routeParams.uuidSlug + '/?format=json').success(function(data) {
        $scope.respondent = data;
        $scope.surveySlug = data.survey_slug
        
        $http.get('/api/v1/response?format=json&limit=0&respondant__uuid=' + $routeParams.uuidSlug).success(function (data) {
            var responses = data.objects;
            _.each(responses, function (response) {
                // response.answer_parsed = JSON.parse(response.answer_raw);
                response.answer_parsed = response.answer;
            });
            $scope.respondent.responses = responses;
        });
        if ($scope.surveySlug.match(/puerto-rico/)) {
            $scope.groups = _.groupBy($scope.getResponseBySlug('fish-species-puerto-rico'), 'groupName');
            $scope.fw = _.indexBy($scope.getResponseBySlug('fish-weight-price-puerto-rico'), 'text');
            console.log($scope.fw);
        }
    });


    $scope.uuid = $routeParams.uuidSlug;

    $scope.activePage = 'survey-detail';
    $scope.map = {
        center: {
            lat: 47,
            lng: -124
        },
        zoom: 7
    };

    $scope.ackNotification = function (respondent) {
        respondent.spin = true;

        return $http({
            url: respondent.resource_uri.replace('reportrespondant', 'offlinerespondant'),
            data: { 'notify_seen_at': new Date() },
            method: 'PATCH'
        })
            .success(function(data) {
                respondent.spin = false;
                respondent.notify_seen_at = data.notify_seen_at;
                respondent.hide_button = true;
            })
            .error(function(err) {
                // TraceKit.report({message: err});
                console.log('error');
            });
    };

    $scope.getResponseBySlug = function(slug) {
        var question = _.filter($scope.response.responses, function(item) {
            return item.question.slug === slug;
        });

        return _.first(question);
    }
});
