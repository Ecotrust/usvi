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
            boundaryPath: '='
        }
    };

    directive.link = function (scope, element) {
        var map,
            markers = [];

        function init () {
            map = MapUtils.initMap(element[0].children[0].children[0],
                    scope.lat, scope.lng, scope.zoom);

            if (scope.boundaryPath) {
                MapUtils.addGeoJson(scope.boundaryPath, function (layer) {
                    map.addLayer(layer);

                    // .on('dblclick', function(e) {
                    //     map.setZoom(map.getZoom() + 1);
                    // });

                    if (map.hasLayer(layer)) {
                        if (console) { console.log('MAP HAS GEOJSON LAYER'); }
                    }

                });
            }

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
                    scope.ecosystemLabel =  ecosystemSlugToLabel(markerData.qSlug);
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

        function ecosystemSlugToLabel (slug) {
            var pointsKey = 'points',
                areasKey = 'areas',
                key,
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

            key = slug.indexOf(pointsKey) > -1 ? pointsKey : areasKey;
            key = slug.slice(0, -key.length);

            return dict[key];
        }

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
        },

        createMarker: function (config) {
            var marker;
            if (config.lat && config.lat) {
                marker = new L.marker([config.lat, config.lng], {
                    draggable: config.draggable ? true : false,
                    title: 'click for details',
                    icon: L.AwesomeMarkers.icon({
                        icon: 'icon-circle',
                        color: 'red'
                    })
                });                
                // marker.closePopup();
            }
            return marker;
        }
    };

    return directive;
});


                // marker = new L.circleMarker([config.lat, config.lng], {
                //     radius: 5,
                //     fillColor: "#ff7800",
                //     color: "#000",
                //     weight: 1,
                //     opacity: 1,
                //     fillOpacity: 0.8
                // });
                // marker = new L.circle([config.lat, config.lng], 6000, {
                //     color: 'red',
                //     fillColor: '#f03',
                //     fillOpacity: 1.0
                // });