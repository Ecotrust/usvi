
angular.module('askApp')
    .controller('AnnualCatchLimitProgressCtrl', function($scope, $http, $routeParams, $location) {
        $scope.areaMapping = {
            stcroix: "St. Croix",
            stthomasstjohn: "St. Thomas & St. John",
            puertorico: "Puerto Rico",
            uscaribeez: "Region"
        };
        $scope.user = app.user;

        $scope.activePage = 'overview';
        var getAclReport = function () {
            var url = app.server + '/reports/distribution/all/weight-*?';

            if ($scope.filter.area) {
                url = url + "filters="+ JSON.stringify({island: $scope.areaMapping[$scope.filter.area].replace(/&/, '|')});
            }
            if ($scope.filter.accepted) {
                url = url + "&accepted=true";
            }
            $http.get(url)
                .success(function (data) {

                    $scope.summary = data.results.length ? data.results : false;
                    if ($scope.summary) {
                        $scope.byFamily = _.groupBy($scope.summary, 'species__family__name');
                        $scope.bySpecies = _.groupBy($scope.summary, 'species__name');
                        $scope.bySpeciesCode = _.groupBy($scope.summary, 'species__code');
                        $scope.byFamilyCode = _.groupBy($scope.summary, 'species__family__code');
                        $scope.slides = [];
                        $scope.familyNames = _.keys($scope.byFamily).sort();
                        $scope.totalIndex = {};
                        $scope.aclResults = [];
                         _.each(_.filter($scope.acls, function (acl) {
                                return acl.area === $scope.filter.area
                            }),
                        function (acl) {
                            var groups, total;
                            if (acl.by_species) {
                                groups = $scope.bySpeciesCode[acl.species.code];
                            } else {
                                groups = $scope.byFamilyCode[acl.species.code];
                            }
                            total = _.reduce(_.pluck(groups, 'total'),
                                    function (memo, num) { return memo + num; }, 0);
                            $scope.aclResults.push({
                                groups: groups,
                                acl: acl,
                                total: total,
                                percent: total / acl.pounds * 100,
                                tooltip: 'acl total: ' + acl.pounds + ' ' + ' lbs<br/>' + 'entered at: ' + acl.updated_at
                            });


                        });

                        $scope.aclResults = $scope.aclResults.sort(function (a,b) {
                            return b.percent - a.percent;
                        });
                        var i=0, chunk=3, aclChunks, tmpArray;
                        while (i < _.size($scope.aclResults)) {
                            aclChunks = $scope.aclResults.slice(i,i+chunk);
                            tmpArray = [];

                            _.each(aclChunks, function (aclChunk) {
                                var groups =  aclChunk.groups;
                                var extra = {
                                    term: "misc",
                                    count: 0,
                                    groups: []
                                };
                                var terms = [];

                                _.each(groups, function (group) {
                                    if (group.total && group.total/aclChunk.acl.pounds > .05) {
                                        terms.push({
                                            term: [group.species__name, group.col_text].join(' '),
                                            count: group.total
                                        });
                                    } else {
                                        extra.count = extra.count + group.total;
                                        extra.groups.push(group.species__name);
                                    }

                                });
                                if (extra.count > 0) {
                                        extra.term = extra.groups.join(', ');
                                        terms.push(extra);
                                    }
                                if (aclChunk.total !== aclChunk.acl.pounds) {
                                    terms.unshift({
                                        term: 'Unfilled',
                                        count: aclChunk.acl.pounds - aclChunk.total
                                    });
                                }

                                tmpArray.push({
                                    name: aclChunk.acl.species.name,
                                    families: groups,
                                    data: {
                                        _type : "terms",
                                        missing : 0,
                                        total : aclChunk.acl.pounds,
                                        other : 0,
                                        terms : terms.reverse()
                                    }
                                });
                            });
                            $scope.slides.push(tmpArray);
                            $scope.slideIndex = 0;
                            i = i + chunk;
                            $scope.families = [];
                            _.each($scope.familyNames, function (name) {
                                $scope.families.push({
                                    name: name,
                                    families: $scope.byFamily[name],
                                    total: $scope.totalIndex[name]
                                });
                            });
                        }
                    } else {
                        $scope.slides = [];
                        $scope.aclResults = [];
                    }


                })
                .error(function (err) {
                    debugger;
                });
        }

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
            "accepted": true
        };
        if ($scope.user.isPuertoRico && ! $scope.user.isUsvi) {
            $scope.filter.area = "puertorico";
        } else if ($scope.user.isUsvi) {
            $scope.filter.area = "stcroix";
        }



        $http.get('/api/v1/annualcatchlimit/?limit=0&format=json').success(function (data) {
            // getAclReport();
            $scope.acls = data.objects;
            getAclReport();

            $scope.$watch('filter', function (newFilter) {
                $location.search($scope.filter);
                $scope.area = $scope.areaMapping[$scope.filter.area];
                getAclReport();
            }, true);
        });
    });