angular.module('askApp').directive('dashMapOst', function($http, $compile, $timeout, $routeParams) {

    var directive = {
        templateUrl: app.viewPath + 'views/ost/dashMapOst.html',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            questionSlugPattern: '=',
            lat: "=",
            lng: "=",
            zoom: "=",
            points: '=',
            units: '=',
            boundaryPath: '=',
            slugToColor: '&',
            slugToLabel: '&'
        }
    };

    directive.link = function (scope, element) {
        var map,
            markers = [];

        function init () {
            map = MapUtils.initMap(element[0].children[0].children[0],
                    scope.lat, scope.lng, scope.zoom);

            MapUtils.addGeoJson(scope.boundaryPath, function (layer) {
                map.addLayer(layer)
                .on('dblclick', function(e) {
                    map.setZoom(map.getZoom() + 1);
                });
            });

            scope.showBoundary = true;
            scope.showPoints = true;
            scope.showUnits = false;
            scope.$watch('points', function(newVal, oldVal) {
                _.each(markers, delMarker)
                _.each(newVal, addMarker);
            });
        }

        function delMarker (marker) {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        }

        function addMarker (markerData) {
            markerData['draggable'] = false;
            markerData['color'] = scope.slugToColor({slug: markerData.qSlug});
            var marker = MapUtils.createMarker(markerData);
            marker.addTo(map);
            markers.push(marker);
            setPopup(marker, markerData);
        }

        function setPopup(marker, markerData) {
            var loading = '<p ng-show="responses == false" class="load-indicator">Loading...</p>', 
                popup = '',
                list = '';
            
            list += '<dt>Ecosystem Feature:</dt>';
            list += '<dd>{{ ecosystemLabel }}</dd>';
            list += '<dt>Title:</dt>';
            list += '<dd>{{ responses["proj-title"] }}</dd>';
            list += '<dt>Duration:</dt>';
            list += '<dd>{{ responses["proj-data-years"].text }}</dd>';
            list += '<dt>Frequency:</dt>';
            list += '<dd>{{ responses["proj-data-frequency"].text }}</dd>';
            list += '<dt>Data Availability:</dt>';
            list += '<dd>{{ responses["proj-data-availability"].text }}</dd>';
            list = '<dl ng-cloak>' + list + '</dl>';

            popup = '<div class="marker-popup-content">' + loading + list + '</div>';

            marker.bindPopup(popup, { closeButton: true });
            
            marker.on('click', function(e) {
                scope.responses = false;
                getRespondent(markerData.uuid, function (responses) {
                    scope.responses = responses;
                    scope.ecosystemLabel =  scope.slugToLabel({slug: markerData.qSlug});
                    // The popup is added to the DOM outside of the angular framework so
                    // its content must be compiled for any interaction with this scope.
                    if (map._popup) {
                        $compile(angular.element(map._popup._contentNode))(scope);
                    }
                });
            });
        }

        function getRespondent (uuid, success_callback) {
            var url = app.server 
                  + '/api/v1/reportrespondantdetails/'
                  + uuid 
                  + '/?format=json';        

            $http.get(url).success(function (data) {
                var respondent = data,
                    responses = {};
                if (typeof(respondent.responses.question) !== 'string') {
                    _.each(respondent.responses, function(response, index) {
                        try {
                            answer_raw = JSON.parse(response.answer_raw);
                        } catch(e) {
                            console.log('failed to parse answer_raw');
                            answer_raw = response.answer;
                        }
                        responses[response.question.slug] = answer_raw;
                    });
                }
                success_callback(responses);
            }).error(function (err) {
                debugger;
            }); 
        };

        init();

    };


    var MapUtils = {

        initMap: function (mapElement, lat, lng, zoom) {
            var nauticalLayer, bingLayer, map, baseMaps, options; 

            nauticalLayer = L.tileLayer.wms("http://egisws02.nos.noaa.gov/ArcGIS/services/RNC/NOAA_RNC/ImageServer/WMSServer", {
                format: 'img/png',
                transparent: true,
                layers: null,
                attribution: "NOAA Nautical Charts"
            });

            bingLayer = new L.BingLayer("Av8HukehDaAvlflJLwOefJIyuZsNEtjCOnUB_NtSTCwKYfxzEMrxlKfL1IN7kAJF", {
                type: "AerialWithLabels"
            });

            map = new L.Map(mapElement, { inertia: false })
                .addLayer(bingLayer)
                .setView(
                    new L.LatLng(lat || 18.35, lng || -64.85), 
                    zoom || 11);

            map.attributionControl.setPrefix('');
            map.zoomControl.setPosition('bottomright');

            // Setup layer picker
            baseMaps = { "Satellite": bingLayer, "Nautical Charts": nauticalLayer };
            options = { position: 'bottomleft' };
            L.control.layers(baseMaps, null, options).addTo(map);

            return map;
        },

        addGeoJson: function (geojsonPath, success_callback) {
            if (geojsonPath) {
                // Add geojson (intended for study area boundary.
                $http.get(geojsonPath).success(function(data) {
                    var boundaryStyle = {
                        "color": "#E6D845",
                        "weight": 3,
                        "opacity": 0.6,
                        "fillOpacity": 0.0,
                        "clickable": false
                    },
                    layer = L.geoJson(data, { style: boundaryStyle });
                    success_callback(layer);
                });
            }
        },

        createMarker: function (config) {
            var marker;
            if (config.lat && config.lat) {
                
                marker = new L.circleMarker([config.lat, config.lng], {
                    radius: 6,
                    /* border */
                    color: "#FFFFFF",
                    opacity: 1,
                    weight: 1,
                    /* fill */
                    fillColor: config.color,
                    fillOpacity: 1.0
                });
                
                marker.on('mouseover', function (e) {
                    marker.setStyle({
                        weight: 3
                    });
                });
                
                marker.on('mouseout', function (e) {
                    marker.setStyle({
                        weight: 1
                    });
                });
            }
            return marker;
        }
    };

    return directive;
});
