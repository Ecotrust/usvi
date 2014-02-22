//'use strict';

angular.module('askApp')
    .controller('UserListCtrl', function($scope, $http, $routeParams, $location) {
    	$scope.activePage = 'users';
    	$scope.filter = {
    		type: 'staff'
    	};
        $scope.deleteUser = function (user) {
            var resource_uri = user.resource_uri;
            $http({
                url: user.resource_uri,
                method: 'DELETE',
                data: user
            }).success(function (data, status, func, headers) {
                var uri = headers.data.resource_uri;
                $scope.users = _.without($scope.users,
                    _.findWhere($scope.users, { resource_uri: uri }));
            });
        }
    	$scope.getUsers = function (metaUrl, button) {
    		var url;
    		if (metaUrl) {                
    			url = metaUrl;
    		} else {
    			url = app.server + '/api/v1/user/?format=json&limit=5';
    			if ($scope.filter.type == 'staff') {
	    			url = url + '&is_staff=true';
	    		} else {
	    			url = url + '&is_staff=false';
	    		}
    		}
    		
    		$http.get(url).success(function(data) {
	            $scope.users = data.objects;
	            $scope.meta = data.meta;
	        });
    	};
    	$scope.getUsers();
    	$scope.$watch('filter.type', function () {
    		$scope.getUsers();
    	});
        
    });