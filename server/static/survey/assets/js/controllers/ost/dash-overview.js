
angular.module('askApp').controller('DashOverviewCtrl', function($scope, $http, $routeParams, $location, surveyFactory, dashData, chartUtils, survey) {

    $scope.page_title = "What and Where?";
    $scope.loadingSurveys = true;
    function initPage () {
        $scope.activePage = 'overview';
        $scope.user = app.user || {};

        $scope.filtersJson = '';
        $scope.filters = { ecosystemFeatures: [] };
        
        // Get or load survey
        $scope.survey = {};
        $scope.survey.slug = $routeParams.survey_slug;

        $scope.survey.loading = true;
        surveyFactory.getSurvey(function (data) {
            data.questions.reverse();
            $scope.survey = data;
        });
    

        $scope.mapSettings = {
            questionSlugPattern: '*-collection-points',
            lat: 35.8336630,
            lng: -122.0000000,
            zoom: 7
        };
        $scope.updateMap();

        $scope.$watch('filters.ecosystemFeatures', function(newVal, oldVal) {
            $scope.filtersJson = [];
            
            _.each($scope.filters.ecosystemFeatures, function (label) {
                var slug = ecosystemLabelToSlug(label);
                //$scope.filtersJson.push({'ecosystem-features': slug});
            });

            // Update respondent table
            $scope.goToPage(1, $scope.filters.ecosystemFeatures);

        });
    }

    //
    // Fill survey stats blocks
    //

    $scope.survey = {};
    $scope.survey.slug = $routeParams.survey_slug;
    
    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });

    $scope.$watch('survey', function(newVal){
        if (newVal) {
            $scope.loadingSurveys = false;
        }
    });

    //
    // Map
    // 
    $scope.updateMap = function (action) {
        /*
        Params:
        - action - The only action this supports is 'clear'. This clears the map and the filters.

        - builds the filtersJson based on the $scope.filters.ecosystemFeatures
        - Builds URL's for points and polys (note: polys does not contain the geometry, only the ID of a grid cell).
        - Calls getPoints and getPolys and defines their callbacks.
        - Puts points on $scope.mapSettings.mapPoints
        - Puts polys $scope.mapSettings.mapPlanningUnits

        */
        if (action === 'clear') {
            $(".sidebar_nav .multi-select2").select2('data', null);
            $scope.filters.ecosystemFeatures = [];
            //$scope.$apply();
        }

        var filtersJson = _.map($scope.filters.ecosystemFeatures, function (label) {
            var slug = ecosystemLabelToSlug(label);
            if (slug.length>0) {
                return {'ecosystem-features': slug};
            } else {
                return null;
            }
        });
        filtersJson = _.flatten(filtersJson);

        var pointsUrl = pointsApiUrl($routeParams.surveySlug, '*-collection-points', filtersJson),
            polysUrl = polysApiUrl($routeParams.surveySlug, '*-collection-areas', filtersJson);
        
        getPoints(pointsUrl, function (points) {
            $scope.mapSettings.mapPoints = points;
            var uniq = [];
            _.each(points, function (point) {
                if (! _.contains(uniq, point.qSlug)) {
                    uniq.push(point.qSlug);
                }
            });
            $scope.uniqueEcosystemFeatureSlugs = uniq;
        });
    
        getPolys(polysUrl, function (polys) {
            $scope.mapSettings.mapPlanningUnits = polys;
        });
    }

    function pointsApiUrl (sSlug, qSlug, filtersJson) {
        var url = ['/reports/geojson', sSlug, qSlug];
        if (filtersJson && !_.isEmpty(filtersJson)) {
            url.push('?filters=' + JSON.stringify(filtersJson));
        }
        return url.join('/');
    }

    function polysApiUrl (sSlug, qSlug, filtersJson) {
        var url = ['/reports/planningunits', sSlug, qSlug];
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


    function getPolys (url, success_callback) {
        $http.get(url).success(function(data) {
            
            var polys = [];
            _.each(data.answers, function (unit_id) {
                polys.push(unit_id);
            });
            success_callback(polys);
        });
    }

    function ecosystemLabelToSlug (label) {
        return survey.ecosystemLabelToSlug(label);
    }

    $scope.ecosystemSlugToLabel = function (slug) {
        return survey.ecosystemSlugToLabel(slug);
    }

    $scope.ecosystemSlugToColor = function (slug) {
        return survey.ecosystemSlugToColor(slug);
    };


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
