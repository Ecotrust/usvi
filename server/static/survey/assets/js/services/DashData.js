
angular.module('askApp')
  .factory('dashData', function ($http) {


    var getDistribution = function(surveySlug, questionSlug, filters, onSuccess, onFail) {
        var url = _distributionUrl(surveySlug, questionSlug, filters);
        $http.get(url)
            .success(onSuccess)
            .error(onFail);

        return url;
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


    var _distributionUrl = function (surveySlug, questionSlug, filters) {
        var url = ["/reports/distribution", surveySlug, questionSlug].join('/');
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

