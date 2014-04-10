(function() {
        'use strict';
        angular.module('askApp').controller('UpdateCtrl', ['$scope', '$window',
                function UpdateCtrl($scope, $window) {
                    $scope.close = function () {
                        $window.close();
                    };

                }]);

    })();