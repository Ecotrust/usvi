
angular.module('askApp')
    .controller('AnnualCatchLimitProgressCtrl', function($scope, $http, $routeParams) {
        var areaMapping = {
            stcroix: "St. Croix",
            stthomas: "St. Thomas",
            puertorico: "Puerto Rico"
        }
        var getAclReport = function (filters) {
            var url = app.server + '/reports/distribution/catch-report/weight-*';
            var params = {};
            _.each(filters, function (v, k) {
                if (v) {
                    console.log(k);
                    if (params.area) {
                        params.area.push(areaMapping[k]);
                    } else {
                        params.area = [areaMapping[k]];
                    }
                }
            });
            if (params.area) {
                url = url + "?filters="+ JSON.stringify({island: params.area});
            }
            $http.get(url)
                .success(function (data) {
                    $scope.summary = data.results.length ? data.results : false;

                    if ($scope.summary) {
                        $scope.byFamily = _.groupBy($scope.summary, 'species__family__name');    
                        $scope.bySpecies = _.groupBy($scope.summary, 'species__name');    
                        $scope.slides = [];
                        $scope.families = _.keys($scope.byFamily).sort();

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
                                        term: [group.species__name, group.col_text].join(' '),
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
                    } else {
                        $scope.slides = [];
                    }
                    
                    
                })
                .error(function (err) {
                    debugger;
                });
        }

        getAclReport();
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

        $scope.filter = {
            "region": true,
            "area": {    
                "stcroix": false,
                "stthomas": false,
                "puertorico": false
            }
        };

        $scope.$watch('filter.area', function (newFilter) {
            if (_.any(_.values(newFilter))) {
                $scope.filter.region = false;
                getAclReport(newFilter);
            } else {
                $scope.filter.region = true;
            }
            
        }, true);

        $scope.$watch('filter.region', function (newFilter) {
            if (newFilter) {
                _.each($scope.filter.area, function (v, k, list) {
                    list[k] = false;
                });
                getAclReport();
            }

        });

    });