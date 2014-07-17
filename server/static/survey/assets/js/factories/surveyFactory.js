angular.module('askApp').factory('surveyFactory', function($http, $routeParams, $location) {
    return {
        survey : {},
        getSurvey: function(callback) {
            var self = this;
            if ($routeParams.surveySlug) {
                $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json', {cache:true}).success(function(data) {
                    self.survey = data;
                }).success(callback);
            } else {
                self.survey = null;
            }
        },

        searchRespondants : function(q){
            $location.path('/RespondantList/monitoring-project/').search({q: q});
        }

        

    }
});
