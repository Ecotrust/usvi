//'use strict';

angular.module('askApp')
    .controller('SideBarCtrl', function($scope, $http, $routeParams, $location) {
    	// $scope.activePage = 'reports';
     //    $http.get(app.server + '/api/v1/surveyreport/?format=json').success(function(data) {
     //        $scope.surveys = data.objects;
     //    })
    	$scope.search = function (searchTerm) {
    		$location.path('/RespondantList/catch-report').search({q: searchTerm});
    	};
    	$scope.$watch(function () { return $location.search().q; }, function (newTerm) {
    		$scope.searchTerm = newTerm;
    	});
        $scope.survey_meta = app.survey_meta;
    });