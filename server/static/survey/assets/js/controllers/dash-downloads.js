//'use strict';

angular.module('askApp')
    .controller('DashDownloadsCtrl', function($scope) {
        $scope.activePage = 'downloads';
        $scope.user = app.user;
    });