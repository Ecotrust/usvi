
angular.module('askApp').controller('DashOverviewCtrl', function($scope, $http, $routeParams, $location, surveyFactory, dashData, chartUtils) {
    
    $scope.activePage = 'overview';
    $scope.user = app.user || {};
    $scope.filtersJson = '';
    $scope.questionSlugPattern = '*-collection-points';

    //
    // Fill survey stats blocks
    //
    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });


    //
    // Map
    // 
    var mapUtils = {

        pointsApiUrl: function (sSlug, qSlug, filtersJson) {
            var url = ['/reports/geojson', sSlug, qSlug];
            if (filtersJson) {
                url.push('?filters=' + filtersJson);
            }
            return url.join('/');
        },

        getPoints: function (url, success_callback) {
            $http.get(url).success(function(data) {
                // Set points collection (bound to directive)
                var points = [];
                _.each(data.geojson, function (item) {
                    var feature = JSON.parse(item.geojson)
                      , lat = feature.geometry.coordinates[1]
                      , lng = feature.geometry.coordinates[0]
                      , uuid = feature.properties.activity
                      , qSlug = feature.properties.label
                      ;
                    if (lat && lng && uuid && qSlug) {
                        points.push({
                            lat: lat,
                            lng: lng,
                            uuid: uuid,
                            qSlug: qSlug});
                    }
                });

                success_callback(points);
            });
        },

        getMapCenter: function (qSlug) {
            // Get center and zoom for map.
            // todo
        },

        getCategories: function (data) {
            // Find out which categories are present.
            // var filterItems;
            // if (!scope.filterItems) {
            //     filterItems = _.map(data.geojson, function(location) {
            //         return location.properties.label
            //     });
            //     scope.filterItems = _.uniq(filterItems).sort();
            // }
        }
    };

    var apiUrl = mapUtils.pointsApiUrl($routeParams.surveySlug, $scope.questionSlugPattern, $scope.filtersJson);
    mapUtils.getPoints(apiUrl, function (points) {
        $scope.mapPoints = points;
    });


    //
    // Charts
    //
    $scope.charts = {};
});
