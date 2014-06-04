
angular.module('askApp').controller('DashOverviewCtrl', function($scope, $http, $routeParams, $location, surveyFactory, dashData, chartUtils) {

    function initPage () {
        $scope.activePage = 'overview';
        $scope.user = app.user || {};

        $scope.filtersJson = '';
        $scope.filters = { ecosystemFeatures: [] };
        $scope.mapSettings = {
            questionSlugPattern: '*-collection-points',
            lat: 35.8336630,
            lng: -122.0000000,
            zoom: 7
        };
        $scope.updateMap();

        $scope.$watch('filters.ecosystemFeatures', function(newVal, oldVal) {
            // TODO clear existing markers from map
            console.log('filter changed: ' + $scope.filters.ecosystemFeatures);
            $scope.filtersJson = [];
            _.each($scope.filters.ecosystemFeatures, function (label) {
                var slug = ecosystemLabelToSlug(label);
                console.log('eco label to slug: ' + slug);
                $scope.filtersJson.push({'ecosystem-features': slug});
            });
        });
    }
    

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
    $scope.updateMap = function () {
        var apiUrl = mapUtils.pointsApiUrl($routeParams.surveySlug, $scope.mapSettings.questionSlugPattern, $scope.filtersJson);
        mapUtils.getPoints(apiUrl, function (points) {
            $scope.mapSettings.mapPoints = points;
        });    
    }

    function ecosystemLabelToSlug (label) {
        var dict = {};
        dict['Rocky Intertidal Ecosystems'] = 'ef-rockyintertidal-collection-';
        dict['Kelp and Shallow (0-30m) Rock Ecosystems'] = 'ef-kelp-and-shallow-rock-collection-';
        dict['Mid depth (30-100m) Rock Ecosystems'] = 'ef-middepthrock-collection-';
        dict['Estuarine and Wetland Ecosystems'] = 'ef-estuarine-collection-';
        dict['Soft-bottom Intertidal and Beach Ecosystems'] = 'ef-softbottomintertidal-collection-';
        dict['Soft bottom Subtidal (0-100m) Ecosystems'] = 'ef-softbottomsubtidal-collection-';
        dict['Deep Ecosystems and Canyons (>100m)'] = 'ef-deep-collection-';
        dict['Nearshore Pelagic Ecosystems'] = 'ef-nearshore-collection-';
        dict['Consumptive Uses'] = 'ef-consumptive-collection-';
        dict['Non-consumptive Uses'] = 'ef-nonconsumptive-collection-';

        return dict[label];
    }

    var mapUtils = {

        pointsApiUrl: function (sSlug, qSlug, filtersJson) {
            var url = ['/reports/geojson', sSlug, qSlug];
            if (filtersJson && !_.isEmpty(filtersJson)) {
                url.push('?filters=' + JSON.stringify(filtersJson));
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


    //
    // Charts
    //
    $scope.charts = {};

    initPage();
});
