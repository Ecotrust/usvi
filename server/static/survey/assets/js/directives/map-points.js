angular.module('askApp')
    .directive('mapPoints', function($http) {


        function initMap (mapHtmlElement, questionSettings) {
            // Setup layers
            var nautical, bing, initPoint, initialZoom, map, baseMaps, options; 

            nautical = L.tileLayer.wms("http://egisws02.nos.noaa.gov/ArcGIS/services/RNC/NOAA_RNC/ImageServer/WMSServer", {
                format: 'img/png',
                transparent: true,
                layers: null,
                attribution: "NOAA Nautical Charts"
            });
            bing = new L.BingLayer("Av8HukehDaAvlflJLwOefJIyuZsNEtjCOnUB_NtSTCwKYfxzEMrxlKfL1IN7kAJF", {
                type: "AerialWithLabels"
            });

            initPoint = new L.LatLng(18.35, -64.85);
            if (questionSettings.lat && questionSettings.lng) {
                initPoint = new L.LatLng(questionSettings.lat, questionSettings.lng);
            }
            initialZoom = 11;
            if (questionSettings.zoom) {
                initialZoom = questionSettings.zoom;
            }
            map = new L.Map(mapHtmlElement, {
                inertia: false
            }).addLayer(bing).setView(initPoint, initialZoom);

            map.attributionControl.setPrefix('');
            map.zoomControl.options.position = 'bottomleft';

            // Setup layer picker
            baseMaps = { "Satellite": bing, "Nautical Charts": nautical };
            options = { position: 'bottomleft' };
            L.control.layers(baseMaps, null, options).addTo(map);

            return map;
        }
        

        return {
            templateUrl: app.viewPath + 'views/questionMapPoints.html',
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                question: "=question" //scope.question.geojson, scope.question.zoom, etc
            },
            link: function(scope, element) {

                var map = initMap(element[0], scope.question);

                scope.activeMarker = false;

                // TODO: which of these two if statements handles prefill?
                if (scope.question.answer) {
                    // Prefill UI with available answer.
                    scope.markers = scope.question.answer;
                } else {
                    scope.markers = scope.question.answer = [];
                }
                if (!scope.answer) {
                    scope.locations = [];
                } else {
                    scope.markers = JSON.parse(scope.answer);
                }
                
                scope.onMapClick = function (e) {
                    scope.addMarker(e.latlng);
                };
                map.on('click', scope.onMapClick);
                
                scope.addMarker = function (latlng /* L.latLng */) {
                    alert('lat is ' + latlng.lat);
                    if (scope.activeMarker) {
                        scope.activeMarker.marker.closePopup();
                    }
                    scope.activeMarker = {
                        lat: latlng.lat,
                        lng: latlng.lng,
                        color: scope.getNextColor()
                    };
                    scope.markers.push(scope.activeMarker);
                    location.color = scope.activeMarker.color;
                    scope.activeMarker = false;
                };

                scope.isAddingMarker = function () {
                    return false;
                };

                scope.removeMarker = function(marker) {
                    var markers = _.without(scope.markers, marker);
                    scope.markers = markers;
                };
                
                /**
                 * @return {string} Returns the color to be applied to the next marker.
                 */
                scope.getNextColor = function() {
                    var availableColors = [],
                        colorPalette = [
                                'red',
                                'orange',
                                'green',
                                'darkgreen',
                                'darkred',
                                'blue',
                                'darkblue',
                                'purple',
                                'darkpurple',
                                'cadetblue'
                        ];

                    availableColors = angular.copy(colorPalette);
                    _.each(scope.locations, function(marker) {
                        if (_.has(marker, 'color')) {
                            availableColors = _.without(availableColors, marker.color);
                        }
                        if (availableColors.length == 0) {
                            // Recyle the colors if we run out.
                            availableColors = angular.copy(colorPalette);
                        }
                    });
                    return _.first(availableColors);
                };

            } /* end link function */
        }
    });