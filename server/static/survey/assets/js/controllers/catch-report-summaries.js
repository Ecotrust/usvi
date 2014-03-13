//'use strict';

angular.module('askApp')
	.controller('CatchReportSummariesCtrl', function($scope, $http, $routeParams, $location) {

		var dateFromISO = function(iso_str) {
			// IE8 and lower can't parse ISO strings into dates. See this
			// Stack Overflow question: http://stackoverflow.com/a/17593482
			if ($("html").is(".lt-ie9")) {
				var s = iso_str.split(/\D/);
				return new Date(Date.UTC(s[0], --s[1] || '', s[2] || '', s[3] || '', s[4] || '', s[5] || '', s[6] || ''));
			}
			return new Date(iso_str);
		};

		var start_date = $location.search().ts__gte ?
			new Date(parseInt($location.search().ts__gte, 10)) :
			dateFromISO(app.survey_meta.reports_start);
		var end_date = $location.search().ts__lte ?
			new Date(parseInt($location.search().ts__lte, 10)) :
			dateFromISO(app.survey_meta.reports_end);
		$scope.filter = {
			min: dateFromISO(app.survey_meta.reports_start).valueOf(),
			max: dateFromISO(app.survey_meta.reports_end).valueOf(),
			startDate: start_date.valueOf(),
			endDate: end_date.valueOf(),
			area: "uscaribeez"
		};

		$scope.geojson_layer = '/reports/distribution/all/area-fished*';
		$scope.activePage = 'catch-report-summaries';
		$scope.totals = {};
		$scope.max = 0;
		$http.get(app.server + '/reports/distribution/all/weight-*?').success(function (data) {
			$scope.weights = _.groupBy(data.results, 'species__family__name');
			_.each($scope.weights, function (groups, k) {
				var total = _.reduce(_.pluck(groups, 'total'),
                    function (memo, num) { return memo + num; }, 0);
				if (total > $scope.max) {
					$scope.max = total;
				}
				$scope.totals[k] = total;
			});

		})
	});