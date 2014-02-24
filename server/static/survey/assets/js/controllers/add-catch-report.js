//'use strict';

angular.module('askApp')
	.controller('AddCatchReportCtrl', function($scope, $http, $routeParams, $location) {
		$scope.activePage = 'add-reports';
		$scope.$watch('searchTerm', function() {
			var url = app.server + '/api/v1/user/?format=json&limit=5&is_staff=false';
			if ($scope.searchTerm && $scope.searchTerm > 2) {
				url = url + '&username__icontains=' + $scope.searchTerm;
			}
			$http.get(url).success(function(data) {
				$scope.users = data.objects;
				$scope.meta = data.meta;
			});
		});
	});