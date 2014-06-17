//'use strict';

angular.module('askApp')
    .controller('HistoryCtrl', function($scope, $http, $routeParams, $location, survey) {
        $http.defaults.headers.post['Content-Type'] = 'application/json';

        if (app.user) {
            $scope.user = app.user;    
        } else {
            $location.path('/');
        }

        var queryTypes = { INCOMPLETES: 0, COMPLETES: 1};
        $scope.path = $location.path().slice(1,5);

        $scope.getIncompletes = function() {
            $scope.getList(queryTypes.INCOMPLETES, function (result) {
                // Filter out any respondents without associated responses.
                $scope.incompletes = [];
                _.each(result, function(respondent, index) {
                    if (respondent.responses && respondent.responses.length > 0) {
                        $scope.incompletes.push(respondent);
                    }
                });
            });
        };

        $scope.getCompletes = function() {
            $scope.getList(queryTypes.COMPLETES, function (result) {
                $scope.completes = result;
            });
        };


        $scope.getList = function(queryType, callback) {
            var result = [],
                url = app.server 
                      + '/api/v1/reportrespondant/?user__username__exact=' 
                      + $scope.user.username 
                      + '&limit=0'
                      + '&format=json';

            if (queryType === queryTypes.INCOMPLETES) {
                url = url + '&complete__exact=false'
            } else if (queryType === queryTypes.COMPLETES) {
                url = url + '&complete__exact=true'
            }

            return $http.get(url)
                .success(function (data) {
                    _.each(data.objects, function(respondent, index) {
                        result.push(respondent);
                    });
                    if (callback) {
                        callback(result);
                    }
                })
                .error(function (err) {
                    console.log(JSON.stringify(err));
                    debugger;
                    if (callback) {
                        callback(result);
                    }
                });
        };

        $scope.getIncompletes();
        $scope.getCompletes();        

});