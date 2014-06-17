//'use strict';

angular.module('askApp')
    .controller('RespondentDetailCtrl', function($scope, $http, $routeParams, $location, survey, history) {
    $scope.viewPath = app.viewPath;
    $scope.uuid = $routeParams.uuidSlug;



    $scope.getRespondent = function (respondent_uuid, survey_slug, onSuccess) {
        var url = app.server 
              + '/api/v1/reportrespondantdetails/'
              + respondent_uuid 
              + '/?format=json'
              + '&survey__slug=' + survey_slug;

        return $http.get(url)
            .success(function (data) {
                onSuccess(data);
            }).error(function (err) {
                console.log(JSON.stringify(err));
                $scope.showErrorMessage = true;
            });
    };


    $scope.parseResponses = function (respondent) {
        _.each(respondent.responses, function(response, index) {
            try {
                response.answer = JSON.parse(response.answer_raw);
            } catch(e) {
                console.log('failed to parse answer_raw');
                response.answer = response.answer;
            }
            response.question = response.question.slug;
        });
    };


    $scope.getAnswer = function(questionSlug) {
        return history.getAnswer(questionSlug, $scope.respondent);
    };


    $scope.getTitle = function() {
        return history.getTitle($scope.respondent);
    };


    $scope.answerContains = function (questionSlug, val) {
        return $scope.getAnswer(questionSlug).indexOf(val) > -1;
    };


    $scope.resumeSurvey = function (respondent) {
        $http.get(app.server + '/api/v1/respondant/' + respondent.uuid + '/?format=json').success(function(data) {
            survey.initializeSurvey(data.survey, data.survey.pages);
            survey.resume(respondent);
        });
    };

    $scope.deleteRespondent = function (respondent) {
        $http.get(app.server + '/respond/delete-incomplete/' + respondent.uuid).success(function(data) {
            var path = respondent.complete ? '/completes' : '/incompletes';
            $location.path(path);
            $scope.showDeleteErrorMessage = false;
        }).error(function (data) {
            $scope.showDeleteErrorMessage = true;
        });
    };

    $scope.getRespondent($routeParams.uuidSlug, $routeParams.survey_slug, function (respondent) {
        $scope.respondent = respondent;
        $scope.parseResponses(respondent);
        $scope.backPath = respondent.complete ? '/completes' : '/incompletes';
        $scope.showContent = true;
    });


/*************************** MAP STUFF **********************************/
    
    $scope.mapSettings = {
        questionSlugPattern: '*-collection-points',
        lat: 35.8336630,
        lng: -122.0000000,
        zoom: 7,
        mapPoints: [],
        mapUnits: '',

    };

    $scope.updateMap = function () {
        var apiUrl = pointsApiUrl($routeParams.surveySlug, $scope.mapSettings.questionSlugPattern, $scope.filtersJson, $scope.uuid);
        
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
    };
    
    function pointsApiUrl (sSlug, qSlug, filtersJson, resp_uuid) {
        var url = ['/reports/geojson', sSlug, qSlug];
        
        var del = '?';
        if (filtersJson && !_.isEmpty(filtersJson)) {
            url.push('?filters=' + JSON.stringify(filtersJson));
            del = '&';
        }
        if (resp_uuid) {
            url.push(del+'respondant='+resp_uuid);
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
        return survey.ecosystemLabelToSlug(label);
    }

    $scope.ecosystemSlugToLabel = function (slug) {
        return survey.ecosystemSlugToLabel(slug);
    }

    $scope.ecosystemSlugToColor = function (slug) {
        return survey.ecosystemSlugToColor(slug);
    };

    $scope.updateMap();
/*************************** END MAP STUFF ********************************/




}).directive('answersPanel', function(history) {
    /*
    This directive takes both speciesAnswer and htmlContent. 
    
    If htmlContent is not falsey, it will display the conent form the 
    template defined by htmlContent (this is for the Proejct and Data Managemt, etc... quesitons)
    
    If speciesAnswer is not falsey it will display the answers based on what is in the answerPanel.html. 
    This option is used to display all the Ecosystem Features species answers.

    Note in order for this to work both html-content and species-answer must be attributes on
    the html element, but only one should not be falsey (use a blank string for the other). 
    */
    return {
        templateUrl: '/static/survey/views/ost/answers/answersPanel.html',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            title: '=',
            respondent: '=',
            speciesAnswer: '=',
            htmlContent: '=',
        },
        link: function postLink(scope, element, attrs) {
            scope.open = false;
            scope.angular_version = parseFloat(angular.version.major+'.'+angular.version.minor);
            scope.getAnswer = function(questionSlug) {
                return history.getAnswer(questionSlug, scope.respondent);
            };
        }
    }
}).filter('to_trusted', ['$sce', function($sce){
        return function(text) {
            return $sce.trustAsHtml(text);
        };
}]);

;
