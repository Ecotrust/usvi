angular.module('askApp').service('respondents', function($http) {
	var areaMapping = {
        stcroix: "St. Croix",
        stthomasstjohn: "St. Thomas & St. John",
        puertorico: "Puerto Rico",
        uscaribeez: "Region"
    };
	return {
		getReports: function (url, filter) {
			if (! url) {
				url = [
				    '/api/v1/dashrespondant/search/?format=json&limit=5',
				    '&start_date=' + new Date(filter.startDate).toString('yyyy-MM-dd'),
				    '&end_date=' + new Date(filter.endDate).add(1).day().toString('yyyy-MM-dd')
				].join('');
				if (filter.search) {
				    url = url + '&q=' + filter.search;
				}
				if (filter.area && areaMapping[filter.area] !== 'Region') {
				    url = url + '&island=' + areaMapping[filter.area];
				}
				if (filter.review_status) {
				    url = url + '&review_status=' + filter.review_status;
				}
				if (filter.entered_by) {
				    url = url + '&entered_by=' + filter.entered_by;
				}	
			}
			
			return $http.get(url);
		},
		getIsland: function (area) {
			return areaMapping[area];
		}
	}
});