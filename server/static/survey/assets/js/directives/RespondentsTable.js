/*
    
    Displays a list of respondants in a sortable pagiantated table. 
    
    Usage:

        <table respondant-table respondants='myRespondents' resource='/api/v1/completerespondant/' meta='meta'>

    Input
        respondants - An array of respondant objects from the Viewpoint Survey API.
        resource - the API endpoint
        meta - The returned meta from the API. 

*/

angular.module('askApp')
    .directive('respondentsTable', ['$http', '$location', 'surveyFactory', function(http, location, surveyFactory) {

    return {
        restrict: 'EA',
        templateUrl : app.viewPath +'views/ost/dash-respondents-table2.html',
        scope: {respondents: '=',
                resource:'=',
                meta:'='
            },

        link: function (scope, element, attrs) {
            scope.meta = null;
            scope.http = http;
            scope.surveySlug = surveyFactory.survey.slug;

            scope.location = location;

            scope.showRespondent = function(respondent){
                scope.location.path('/RespondantDetail/'+respondent.survey_slug+'/'+respondent.uuid );
            };

            // Paginated respondent table
            scope.goToPage = function (page) {
                var meta = scope.meta || {}
                    , limit = 8
                    , offset = limit * (page - 1)
                    , url = [
                        scope.resource + '?format=json&limit='+limit
                        , '&offset='+offset
                      ].join('')
                    ;
                scope.http.get(url).success(function (data) {
                    scope.respondents = data.objects;
                    scope.meta = data.meta;
                    scope.currentPage = page;
                });
            };
            
            // Only load first page if not results from a text search
            if (scope.resource === '/api/v1/completerespondant/'){
                scope.goToPage(1);
            }

        }
    };
}]);

