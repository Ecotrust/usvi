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
        },

        dateFromISO : function(iso_str) {
            // IE9 and lower can't parse ISO strings into dates. See this
            // Stack Overflow question: http://stackoverflow.com/a/17593482
            if (parseInt($.browser.version) < 10) {
                var s = iso_str.split(/\D/);
                out = new Date(Date.UTC(s[0], --s[1] || '', s[2] || '', s[3] || '', s[4] || '', s[5] || '', s[6] || ''));
            } else {
                out = new Date(iso_str);
            }
            return out;
        }
    }
});