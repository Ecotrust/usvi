//'use strict';

angular.module('askApp')
    .controller('CatchReportSummariesCtrl', function($scope, $http, $routeParams, $location, respondents) {


        var start_date = $location.search().ts__gte ?
            new Date(parseInt($location.search().ts__gte, 10)) :
            respondents.dateFromISO(app.survey_meta.reports_start);
        var end_date = $location.search().ts__lte ?
            new Date(parseInt($location.search().ts__lte, 10)) :
            respondents.dateFromISO(app.survey_meta.reports_end);
        $scope.filter = {
            min: respondents.dateFromISO(app.survey_meta.reports_start).valueOf(),
            max: respondents.dateFromISO(app.survey_meta.reports_end).valueOf(),
            startDate: start_date.valueOf(),
            endDate: end_date.valueOf(),
            area: "uscaribeez"
        };
        $scope.user = app.user;


        var base_weight_url = app.server + '/reports/distribution/all/weight-*?';
        var base_geojson_layer = '/reports/distribution/all/area-fished*?';
        $scope.activePage = 'catch-report-summaries';
        

        $scope.getReports = function (url) {
            respondents.getReports(url, $scope.filter).success(function (data) {
                $scope.respondents = data.objects;
                $scope.meta = data.meta;

            });
        }
        $scope.goToPage = function (page) {
            $scope.getReports($scope.meta.base_url + '&page=' + page, true);
        };

        $scope.$watchCollection('filter', function(newFilter) {
            var weight_url = base_weight_url, geojson_url = base_geojson_layer;
            $scope.totals = {};
            $scope.max = 0;
            $scope.busy = true;
            $scope.area = respondents.getIsland($scope.filter.area);
            
            // Apply filter values to url strings (if you are not staff, server implicitly restricts to request.user's data)
            weight_url = weight_url + '&start_date=' + new Date($scope.filter.startDate).toString('yyyy-MM-dd');
            weight_url = weight_url + '&end_date=' + new Date($scope.filter.endDate).add(1).day().toString('yyyy-MM-dd');
            geojson_url = geojson_url + '&start_date=' + new Date($scope.filter.startDate).toString('yyyy-MM-dd');
            geojson_url = geojson_url + '&end_date=' + new Date($scope.filter.endDate).add(1).day().toString('yyyy-MM-dd');
            if ($scope.filter.area !== 'uscaribeez') {
                geojson_url = geojson_url + '&island=' + $scope.area.replace(/&/g, "|");
                weight_url = weight_url + '&island=' + $scope.area.replace(/&/g, "|");
            }

            // Triggers an AJAX requestion on the dash-map directive.
            $scope.geojson_layer = geojson_url;

            // AJAX requests for updated reports
            $scope.getReports(null, $scope.filter);
            
            // AJAX request to get wieght statistics
            $http.get(weight_url).success(function(data) {
                $scope.weights = _.groupBy(data.results, 'species__family__name');
                _.each($scope.weights, function(groups, k) {
                    var total = _.reduce(_.pluck(groups, 'total'),
                        function(memo, num) {
                            return memo + num;
                        }, 0);
                    if (total > $scope.max) {
                        $scope.max = total;
                    }
                    $scope.totals[k] = total;
                });
                $scope.busy = false;
            });
        });
    });