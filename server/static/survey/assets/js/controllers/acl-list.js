
angular.module('askApp')
    .controller('AnnualCatchLimitListCtrl', function($scope, $http, $routeParams, $location) {
    	var url = '/api/v1/annualcatchlimit/';
    	$http.get(url + '?format=json').success(function (data) {
            var years = [];
    		$scope.acls = data.objects.sort(function (a,b) {
                if (a.species && b.species) {
                    return a.species.name.localeCompare(b.species.name);    
                } else {
                    return -1;
                }
                
            });
    		$scope.meta = {
    			areas: [],
    			sectors: [],
    		}
    		_.each(data.meta.area_choices, function (item) {
    			$scope.meta.areas[item[0]] = item[1];
    		});
    		_.each(data.meta.sector_choices, function (item) {
    			$scope.meta.sectors[item[0]] = item[1];
    		});
            _.each($scope.acls, function (acl) {
                years.push(new Date(acl.start_date).getYear() + 1900);
                years.push(new Date(acl.end_date).getYear() + 1900);
            });
            $scope.years = _.unique(years).sort();
    	});

        
        $scope.delete = function (acl) {
            // delete an acl
            $scope.confirmDelete = false;
            $http({
                url: acl.resource_uri,
                method: "DELETE",
                data: acl
            }).success(function (data, status, headers, config) {
                var index = _.indexOf($scope.acls,
                    _.findWhere($scope.acls, {id: config.data.id}));
                $scope.acls.splice(index, 1);
            });
        };


        $scope.create = function () {
            // create a new acl
            $http({
                url: url,
                method: "POST",
                data: {}
            }).success(function (data, status, headers, config) {
                $location.path('/acl/' + data.id);
            });
        };
	});