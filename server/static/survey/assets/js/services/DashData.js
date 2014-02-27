//'use strict';

angular.module('askApp')
  .factory('dashData', function ($http) {

    /**
     * [getDistribution description]
     * @param  {[type]} surveySlug   [description]
     * @param  {[type]} questionSlug [description]
     * @param  {[type]} filters      [description]
     * @param  {[type]} onSuccess    [description]
     * @param  {[type]} onFail       [description]
     * @return {[type]}              [description]
     */
    var getDistribution = function(surveySlug, questionSlug, filters, onSuccess, onFail) {
        var url = _distributionUrl(surveySlug, questionSlug, filters);
        $http.get(url)
            .success(onSuccess)
            .error(onFail);

        return url;
    };

    var _distributionUrl = function (surveySlug, questionSlug, filters) {
        var url = ["/reports/distribution", surveySlug, questionSlug].join('/');
        url = url + filters;
        return url;
    }

    // Public API
    return {
        'getDistribution': getDistribution
        //'getPoints': getPoints
    };
});

