
angular.module('askApp')
  .factory('dashData', function ($http) {


    var getDistribution = function(surveySlug, questionSlug, filters, onSuccess, onFail) {
        var url = _distributionUrl(surveySlug, questionSlug, filters, false),
            csvUrl = _distributionUrl(surveySlug, questionSlug, filters, true);
        $http.get(url)
            .error(function (data) {
                onFail(data);
            })
            .success(function (data) {
                data.csvUrl = csvUrl;
                onSuccess(data);
            });
    };


    var formatFilters = function(rawFilters) {
        var filters = [],
            newFiltersJson;

        _.each(rawFilters, function (v, k) {
            var thisFilter = {};
            
            if (v.length) {
                thisFilter[k] = v;
                filters.push(thisFilter);
            }
        });
        
        return JSON.stringify(filters);
    };


    var _distributionUrl = function (surveySlug, questionSlug, filters, isForCsv) {
        var baseUrl = "/reports/distribution" + (isForCsv ? "/csv" : "")
        var url = [baseUrl, surveySlug, questionSlug].join('/');
        if (filters.length > 0) {
            url = url + '?filters=' + filters;
        }
        return url;
    };


    return {
        'getDistribution': getDistribution,
        'formatFilters': formatFilters
    };
});

