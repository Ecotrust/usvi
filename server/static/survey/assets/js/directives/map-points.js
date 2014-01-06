angular.module('askApp')
    .directive('mapPoints', function($http, $compile) {

        var MapUtils = {

            initMap: function (mapHtmlElement, questionSettings) {
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
            },

            createMarker: function (markerConfig) {
                var marker;
                if (markerConfig.lat && markerConfig.lat) {
                    marker = new L.marker(
                        markerConfig, {
                            draggable: markerConfig.draggable ? true : false,
                            title: 'click for details',
                            icon: L.AwesomeMarkers.icon({
                                icon: 'icon-circle'
                            })
                        });
                    marker.closePopup();
                }
                return marker;
            }

        };


        return {
            templateUrl: app.viewPath + 'views/questionMapPoints.html',
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                question: "=", //scope.question.geojson, scope.question.zoom, etc
                answer: "=" // the value to set on each marker
            },
            link: function(scope, element) {


                var map = MapUtils.initMap(element[0].children[0], scope.question);
                scope.question.markers = [];
                scope.activeMarker = false;
                scope.isAddingMarker = false;


                scope.onMapClick = function (e) {
                    // assumption: this event is called outside of the angular framework
                    scope.$apply(function (scope) {
                        scope.addMarker(e.latlng);
                    });
                };
                

                scope.addMarker = function (latlng /* Leaflet LatLng */) {
                    var marker, popup;

                    if (! scope.isAddingMarker) {
                        return;
                    }

                    if (scope.activeMarker) {
                        scope.activeMarker.closePopup();
                    }

                    marker = MapUtils.createMarker(latlng);

                    marker.data = {
                        lat: latlng.lat.toString(),
                        lng: latlng.lng.toString(),
                        answers: [{text: "dummyanswer", label: "dummylabel"}]
                    };

                    popup += '<a href="javascript:void(0)" class="btn btn-danger pull-right" ng-click="removeMarkerWrapper(activeMarker)"><i class="icon-trash"></i>&nbsp;Remove</a>';
                    popup += '<div class="clearfix"></div>';
                    marker.bindPopup(popup, { closeButton: true });
                    marker.on('click', function(e) {
                        scope.activeMarker = marker;
                        // The popup is added to the DOM outside of the angular framework so
                        // its content must be compiled for any interaction with this scope.
                        $compile(angular.element(map._popup._contentNode))(scope);
                        scope.$digest();
                    });

                    scope.question.markers.push(marker);
                    scope.addMarkerToMap(marker);
                    scope.isAddingMarker = false;
                    scope.activeMarker = false;
                };


                scope.addMarkerToMap = function (marker /* Leaflet Marker */) {
                    map.addLayer(marker);
                };


                scope.removeMarker = function(marker) {
                    // Remove from answer.
                    var markers = _.without(scope.question.markers, marker);
                    scope.question.markers = markers;
                    // Remove from UI.
                    map.removeLayer(marker);
                };


                scope.removeMarkerWrapper = function () {
                    scope.removeMarker(scope.activeMarker);
                };


                if (scope.question.answer) {
                    // Prefill UI with available answer.
                    _.each(scope.question.answer, function (data) {
                        if (data.lat && data.lng) {
                            scope.addMarker(L.latLng(data.lat, data.lng));
                        }
                    });
                }

                map.on('click', scope.onMapClick);

            } /* end link function */
        }
    });