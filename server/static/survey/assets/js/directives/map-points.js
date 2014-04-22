angular.module('askApp')
    .directive('mapPoints', function($http, $compile, $timeout) {

        var MapUtils = {

            initMap: function (mapHtmlElement, questionSettings, geojsonPath) {
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

                if (geojsonPath) {
                    // Add geojson (intended for study area boundary.
                    $http.get(geojsonPath).success(function(data) {
                        var boundaryStyle = {
                            "color": "#E6D845",
                            "weight": 3,
                            "opacity": 0.6,
                            "fillOpacity": 0.0,
                            "clickable": false
                        };
                        L.geoJson(data, { style: boundaryStyle })
                        .addTo(map)
                        .on('dblclick',
                            function(e) {
                                map.setZoom(map.getZoom() + 1);
                            });
                    });
                }

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
                answer: "=", // the value to set on each marker
                boundaryPath: "="
            },
            link: function(scope, element) {

                var map = MapUtils.initMap(element[0].children[1].children[0], scope.question, scope.boundaryPath);
                scope.question.markers = [];
                scope.activeMarker = false;
                scope.addByClick = false;
                scope.hoverLatLng = {};

                $(".block-title").hide();
                $(".question-title").addClass('map-question-title');
                $("body").addClass('map-question');

                scope.onMapClick = function (e) {
                    if (scope.addByClick) {
                        // assumption: this event is called outside of the angular framework
                        scope.$apply(function (scope) {
                            scope.addMarker(e.latlng);
                        });
                    }
                };

                scope.onMouseMove = function (e /*Leaflet MouseEvent */) {
                    scope.$apply(function (scope) {
                        scope.hoverLatLng = e.latlng;
                        $('.floatingMouseCoordinates').css('top', e.containerPoint.y + 40);
                        $('.floatingMouseCoordinates').css('left', e.containerPoint.x + 15);
                    });
                };

                scope.onMouseOut = function (e /*Leaflet MouseEvent */) {
                    scope.$apply(function (scope) {
                        scope.hoverLatLng = null;
                    });
                };


                /**
                 * Used to validate the manually entered lat lng values.
                 */
                scope.isValidLatLng = function (latlng /* {lat: <string>, lng: <string>} */) {
                    var isValidLat = false, 
                        isValidLng = false, 
                        val,
                        errors = [];

                    // Latitude
                    if (latlng && latlng.lat && !isNaN(parseFloat(latlng.lat))) {
                        val = parseFloat(latlng.lat);
                        isValidLat = val >= -90 && val <= 90;
                    }

                    // Longitude
                    if (latlng && latlng.lng && !isNaN(parseFloat(latlng.lng))) {
                        val = parseFloat(latlng.lng);
                        isValidLng = val >= -180 && val <= 180;
                    }

                    return isValidLat && isValidLng;
                };

                scope.addMarkerByLatLng = function (latlng /* {lat: <string>, lng: <string>} */) {
                    if (scope.isValidLatLng(latlng)) {
                        scope.latLngError = null;
                        scope.addMarker(latlng);
                        map.panTo(latlng);
                    } else {
                        scope.latLngError = true;
                    }
                };

                scope.addMarker = function (latlng /* Leaflet LatLng */) {
                    var marker, popup;
                    var invalid = false;

                    if (scope.activeMarker) {
                        scope.activeMarker.closePopup();
                    }

                    latlng['draggable'] = true;
                    marker = MapUtils.createMarker(latlng);

                    marker.data = {
                        lat: latlng.lat.toString(),
                        lng: latlng.lng.toString(),
                        answers: [{text: "not_set", label: "not_set"}]
                    };


                    popup += '<div class="popupCoordinates map-controls-coordinates-container">';
                    popup += '    <p class="coordinate"><span class="coordinate-label pull-left">Lat:</span><span class="value pull-right">{{activeMarker.getLatLng().lat | number:8 }}</span></p>';
                    popup += '    <p class="coordinate"><span class="coordinate-label pull-left">Lng:</span><span class="value pull-right">{{activeMarker.getLatLng().lng | number:8 }}</span></p>';
                    popup += '</div>';
                    popup += '<div class="clearfix"></div>';
                    popup += '<p>Drag marker to adjust. Zoom in for precision.</p>';
                    popup += '<div class="btn-container"><a href="javascript:void(0)" class="btn btn-danger" ng-click="removeMarkerWrapper(activeMarker)"><i class="icon-trash"></i>&nbsp;Remove</a></div>';
                    popup += '<div class="clearfix"></div>';
                    popup = '<div class="marker-popup-content">' + popup + '</div>';
                    marker.bindPopup(popup, { closeButton: true });
                    marker.on('click', function(e) {
                        scope.activeMarker = marker;
                        // The popup is added to the DOM outside of the angular framework so
                        // its content must be compiled for any interaction with this scope.
                        $compile(angular.element(map._popup._contentNode))(scope);
                        scope.$digest();
                    });

                    $timeout(function () {
                        marker.openPopup();
                        scope.activeMarker = marker;
                        // The popup is added to the DOM outside of the angular framework so
                        // its content must be compiled for any interaction with this scope.
                        $compile(angular.element(map._popup._contentNode))(scope);
                        scope.$digest();
                    }, 200, false);

                    marker.on('dragend', function(e) {
                        scope.updateMarker(marker);
                    });
                
                    scope.question.markers.push(marker);
                    scope.addMarkerToMap(marker);
                    scope.addByClick = false;
                    scope.addByLatLng = false;
                    scope.activeMarker = false;
                };


                scope.addMarkerToMap = function (marker /* Leaflet Marker */) {
                    map.addLayer(marker);
                };

                scope.updateMarker = function (marker /* Leaflet Marker */) {
                    /* Keep the latlng contained in the data used for the 
                       answer updated with the marker's actual latlng. */
                    var ll = marker.getLatLng();
                    marker.data.lat = ll.lat;
                    marker.data.lng = ll.lng;
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
                map.on('mousemove', scope.onMouseMove);
                map.on('mouseout', scope.onMouseOut);

                scope.updateMapSize = function () {
                    scope.windowHeight = window.innerHeight - 300 + 'px';
                    $timeout(function () {
                        map.invalidateSize(false);
                    });                   
                };

                scope.updateMapSize();

                $(window).resize(function(event) {
                    scope.$apply(function () {
                        scope.updateMapSize();
                    });
                });


            } /* end link function */
        }
    });