(function () {
    'use strict';

    angular.module('askApp')
        .controller('SummaryCtrl', function($scope, $http) {
            var url = app.server + '/reports/distribution/catch-report/weight-*?fisher=true';

            $http.get(url)
                .success(function (data) {
                    $scope.summary = data.results.length ? data.results : 'none';
                    $scope.max = _.max($scope.summary, function (item) {
                        return item.total;
                    }).total;
                });
        });
})();
