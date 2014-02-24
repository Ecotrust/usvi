//'use strict';

angular.module('askApp')
    .controller('UserListCtrl', function($scope, $http, $routeParams, $modal, $location) {
        var currentUrl;
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
                // var uri = headers.data.resource_uri;
                // $scope.users = _.without($scope.users,
                //     _.findWhere($scope.users, { resource_uri: uri }));
                $scope.getUsers(currentUrl);
            });
        };
        $scope.showAddUserModal = function () {
            var url = app.server + "/account/createUser";
            
            var modalInstance = $modal.open({
                templateUrl: '/static/survey/views/new-user-modal.html',
                controller: 'NewUserModalCtrl',
                resolve: {
                }
            });
            modalInstance.result.then(function (user) {
                if ($scope.filter.type === 'staff' && user.is_staff) {
                    $scope.users.pop();
                    user.is_new = true;
                    $scope.users.unshift(user);    

                }
            }, function () {
            });
        
        };
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
                if ($scope.searchTerm && $scope.searchTerm > 2) {
                    url = url + '&username__icontains=' + $scope.searchTerm;
                }
    		}
    		
    		$http.get(url).success(function(data) {
	            $scope.users = data.objects;
	            $scope.meta = data.meta;
                currentUrl = url;
	        });
    	};
    	$scope.getUsers();
    	$scope.$watch('filter.type', function () {
    		$scope.getUsers();
    	});
        $scope.$watch('searchTerm', function (newSearch) {
            if (newSearch && newSearch.length > 2)
            $scope.getUsers();
        });
        
    });

angular.module('askApp')
    .controller('NewUserModalCtrl', function($scope, $http, $modalInstance) {
        var errors = {
            'password-mismatch': "Passwords do not match.",
            'invalid-email': "Invalid Email Address",
            'duplicate-user': "User already exists"
        }
        $scope.user = {
            email: null,
            username: null,
            password1: null,
            password2: null,
            type: "staff"
        };
        $scope.showError = false;
        $scope.ok = function() {
            if ($scope.user.password1 === $scope.user.password2) {
                var url = app.server + "/account/createUser";
                
                var newUser = {
                    username: $scope.user.username,
                    emailaddress1: $scope.user.email,
                    emailaddress2: $scope.user.email,
                    password1: $scope.user.password1,
                    password2: $scope.user.password2,
                    type: $scope.user.type,
                    dash: true
                }
                $http.post(url, newUser).success(function (data) {
                    $modalInstance.close(data.user);
                }).error(function (err) {
                    $scope.showError = true;
                    $scope.errorMessage = errors[err]
                })
                
            } else {
                $scope.showError = true;
                $scope.errorMessage = errors['password-mismatch']
            }   
            
        };

        $scope.cancel = function() {
            $modalInstance.dismiss('cancel');
        };
    });