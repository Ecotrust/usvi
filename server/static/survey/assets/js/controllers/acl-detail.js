angular.module('askApp')
    .controller('SpeciesModalCtrl', function($scope, $modalInstance, $http, selectedSpecies) {
        $scope.selectedSpecies = selectedSpecies;

        $scope.selectSpecies = function (species) {
            $scope.selectedSpecies = species;
        }
        $scope.search = function (term) {
            $scope.speciesResults = [];
            if (! term || term == '') {
                return false;
            }
            if (term.length < 3) {
                return false;
            } else {
                $http.get("/api/v1/species/?format=json&name__icontains=" + term).success(function(data) {
                    $scope.speciesResults = $scope.speciesResults.concat(data.objects);
                });
                $http.get("/api/v1/speciesfamily/?format=json&name__icontains=" + term).success(function(data) {
                    $scope.speciesResults = $scope.speciesResults.concat(data.objects);
                });    
            }
            
        };
        if ($scope.selectedSpecies) {
            $scope.search($scope.selectedSpecies.name.slice(0,3));    
        }
        

        $scope.ok = function() {
            $modalInstance.close($scope.selectedSpecies);
        };

        $scope.cancel = function() {
            $modalInstance.dismiss('cancel');
        };
    });

angular.module('askApp')
    .controller('AnnualCatchLimitDetailCtrl', function($scope, $http, $routeParams, $modal, $location) {
        $http.get('/api/v1/annualcatchlimit/' + $routeParams.id + '?format=json').success(function(data) {
            $scope.meta = {
                areas: {},
                sectors: {},
            }
            _.each(data.meta.area_choices, function(item) {
                $scope.meta.areas[item[0]] = item[1];
            });
            _.each(data.meta.sector_choices, function(item) {
                $scope.meta.sectors[item[0]] = item[1];
            });
            delete data.meta;
            $scope.acl = data;

        });
        $scope.years = [];
        $scope.year = false;
        for (var i = new Date().getYear() + 1895; i <= new Date().getYear() + 1905; i++) {
            $scope.years.push(i);
        };
        
        $scope.$watch('year', function (newValue) {
            if (newValue) {
                $scope.acl.start_date = new Date('01/01/' + parseInt(newValue, 10));
                $scope.acl.end_date = new Date('12/31/' + parseInt(newValue, 10));
            }
        });

        $scope.save = function (acl) {
            var newAcl = angular.copy(acl);
            newAcl.species = acl.species.resource_uri;    
           $http({
                url: newAcl.resource_uri,
                data:newAcl,
                method: "PUT"
            }).success(function () {
                $location.path('/acl');
            });
        };

        $scope.open = function() {
            var modalInstance = $modal.open({
                templateUrl: '/static/survey/views/species-modal.html',
                controller: 'SpeciesModalCtrl',
                resolve: {
                    selectedSpecies: function() {
                        return $scope.acl.species;
                    }
                }
            });
            modalInstance.result.then(function (selectedItem) {
              $scope.acl.species = selectedItem;
            }, function () {
            });
        }
    });