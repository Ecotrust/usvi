
angular.module('askApp')
    .controller('AnnualCatchLimitProgressCtrl', function($scope, $http, $routeParams) {
    	var url = app.server + '/reports/distribution/catch-report/weight-*';

        $scope.slideIndex = 0;
        $scope.slideNext = function () {
            if ($scope.slideIndex < $scope.slides.length - 1) {
                $scope.slideIndex++;
            } else {
                $scope.slideIndex = 0;
            }
        }
        $scope.slidePrev = function () {
            if ($scope.slideIndex === 0) {
                $scope.slideIndex = $scope.slides.length - 1;
            } else {
                $scope.slideIndex--;
            }
        }
        $scope.slideTo = function (index) {
            $scope.slideIndex = index;
        }

    	$http.get(url)
    		.success(function (data) {
    			$scope.summary = data.results.length ? data.results : false;
    			// $scope.max = _.max($scope.summary, function (item) {
    			// 	return item.total 
    			// }).total;
                if ($scope.summary) {
                    $scope.byFamily = _.groupBy($scope.summary, 'species__family__name');    
                    $scope.bySpecies = _.groupBy($scope.summary, 'species__name');    
                }
                
                // break families into groups of 3 per slide
                $scope.slides = [];
                $scope.families = _.keys($scope.byFamily);

                var i=1, chunk=3, tmpFamilies, tmpArray;

                while (i < _.size($scope.byFamily)) {
                    tmpFamilies = $scope.families.slice(i,i+chunk);
                    tmpArray = [];

                    _.each(tmpFamilies, function (family) {
                        var groups =  $scope.byFamily[family];
                        var total = _.reduce(_.pluck(groups, 'total'),
                            function (memo, num) { return memo + num; }, 0);
                        var extra = [];
                        var terms = [];

                        _.each(groups, function (group) {
                            terms.push({
                                term: group.species__name,
                                count: group.total
                            });
                        });
                        tmpArray.push({
                            name: family,
                            families: $scope.byFamily[family],
                            data: {
                                _type : "terms",
                                missing : 0,
                                total : total,
                                other : 0,
                                terms : terms
                            }
                        });
                    });
                    $scope.slides.push(tmpArray);
                    i = i + chunk;
                }
    		})
    		.error(function (err) {
    			debugger;
    		});
    });