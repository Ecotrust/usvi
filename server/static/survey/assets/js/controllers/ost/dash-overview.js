
angular.module('askApp').controller('DashOverviewCtrl', function($scope, $http, $routeParams, $location, surveyFactory, dashData, chartUtils, survey) {

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
            console.log('filter changed: ' + $scope.filters.ecosystemFeatures);
            $scope.filtersJson = [];
            _.each($scope.filters.ecosystemFeatures, function (label) {
                var slug = ecosystemLabelToSlug(label);
                console.log('eco label to slug: ' + slug);
                $scope.filtersJson.push({'ecosystem-features': slug});
            });

            // Update respondent table
            $scope.goToPage(1, $scope.filters.ecosystemFeatures);

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
        var apiUrl = pointsApiUrl($routeParams.surveySlug, $scope.mapSettings.questionSlugPattern, $scope.filtersJson);
        getPoints(apiUrl, function (points) {
            $scope.mapSettings.mapPoints = points;
            var uniq = [];
            _.each(points, function (point) {
                if (! _.contains(uniq, point.qSlug)) {
                    uniq.push(point.qSlug);
                }
            });
            $scope.uniqueEcosystemFeatureSlugs = uniq;
        });
    }

    function pointsApiUrl (sSlug, qSlug, filtersJson) {
        var url = ['/reports/geojson', sSlug, qSlug];
        if (filtersJson && !_.isEmpty(filtersJson)) {
            url.push('?filters=' + JSON.stringify(filtersJson));
        }
        return url.join('/');
    }

    function getPoints (url, success_callback) {
        $http.get(url).success(function(data) {
            // Set points collection (bound to directive)
            var points = [];
            _.each(data.geojson, function (item) {
                if (item.geojson) {
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
                };
                
            });

            success_callback(points);
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

    $scope.ecosystemSlugToLabel = function (slug) {
        var key = generalizeEcosystemSlug(slug),
            dict = {};
        dict['ef-rockyintertidal-collection-'] = 'Rocky Intertidal Ecosystems';
        dict['ef-kelp-and-shallow-rock-collection-'] = 'Kelp and Shallow (0-30m) Rock Ecosystems';
        dict['ef-middepthrock-collection-'] = 'Mid depth (30-100m) Rock Ecosystems';
        dict['ef-estuarine-collection-'] = 'Estuarine and Wetland Ecosystems';
        dict['ef-softbottomintertidal-collection-'] = 'Soft-bottom Intertidal and Beach Ecosystems';
        dict['ef-softbottomsubtidal-collection-'] = 'Soft bottom Subtidal (0-100m) Ecosystems';
        dict['ef-deep-collection-'] = 'Deep Ecosystems and Canyons (>100m)';
        dict['ef-nearshore-collection-'] = 'Nearshore Pelagic Ecosystems';
        dict['ef-consumptive-collection-'] = 'Consumptive Uses';
        dict['ef-nonconsumptive-collection-'] = 'Non-consumptive Uses';

        return dict[key];
    }

    $scope.ecosystemSlugToColor = function (slug) {
        return survey.ecosystemSlugToColor(slug);
    };

    function generalizeEcosystemSlug (slug) {
        var pointsKey = 'points',
            areasKey = 'areas',
            s;
        s = slug.indexOf(pointsKey) > -1 ? pointsKey : areasKey;
        s = slug.slice(0, -s.length);

        return s;
    }


    //
    // Paginated respondent table
    //
    $scope.goToPage = function (page, ecosystemFeatureLabels) {
        var meta = $scope.meta || {}
            , limit = 8
            , offset = limit * (page - 1)
            , url = [
                '/api/v1/completerespondant/?format=json&limit='+limit
                , '&offset='+offset
                , '&ef='+ecosystemFeatureLabels.join(',')
              ].join('')
            ;
        $http.get(url).success(function (data) {
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
            $scope.currentPage = page;
        });
    };


    //
    // Charts
    //
    $scope.charts = {};

    initPage();
});
