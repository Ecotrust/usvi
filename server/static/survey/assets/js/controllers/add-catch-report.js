(function() {
	'use strict';
	angular.module('askApp')

	angular.module('askApp')
		.controller('SurveyListModalCtrl', function($scope, $modal, $modalInstance, $http) {
			$http.get('/api/v1/surveyreport/?format=json').success(function(data) {
				$scope.surveys = data.objects;
			});

			$scope.selectSurvey = function(survey) {
				$scope.selectedSurvey = survey;
			}
			$scope.ok = function() {
				$modalInstance.close($scope.selectedSurvey);
			};

			$scope.cancel = function() {
				$modalInstance.dismiss('cancel');
			};
		});

	angular.module('askApp')
		.controller('AddCatchReportCtrl', function($scope, $http, $routeParams, $location, $modal, $window) {
			$scope.activePage = 'add-reports';
			$scope.user = app.user;
			$scope.addCatchReport = function() {
				var modalInstance = $modal.open({
					templateUrl: '/static/survey/views/survey-list-modal.html',
					controller: 'SurveyListModalCtrl',
					resolve: {

					}
				});
				modalInstance.result.then(function(survey) {
					var url = '/respond/' + survey.slug + '?user=' + $scope.user.username;
					$window.open(url, '_blank');

				});
			};
			$scope.getUsers = function(metaUrl, button) {
				var url;
				if (metaUrl) {
					url = metaUrl;
				} else {
					if (button) {
						return false;
					}
					url = app.server + '/api/v1/user/?format=json&limit=5&is_staff=false';
				}
				if ($scope.searchTerm && $scope.searchTerm.length > 2) {
					url = url + '&username__icontains=' + $scope.searchTerm;
				}
				$http.get(url).success(function(data) {
					$scope.users = data.objects;
					$scope.meta = data.meta;
				});
			};
			$scope.$watch('searchTerm', function() {
				$scope.getUsers();
			});
		});
})();