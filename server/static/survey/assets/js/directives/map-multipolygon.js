angular.module('askApp')
    .directive('map', function($http, $timeout, $routeParams) {
        return {
            templateUrl: app.viewPath + 'views/questionMapPolygons.html',
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                question: "=question" //scope.question.geojson, scope.question.zoom, etc
            },
            link: function(scope, element) {
                scope.allPloygons = [];
                scope.selectionCount = 0;

                if (scope.question.answer) {

                    //debugger;
                } else {
                    scope.question.answer = [];
                }
                var $el = element[0].children[1].children[0];

                $(".block-title").hide();
                $(".question-title").addClass('map-question-title');
                $("body").addClass('map-question');

                // Layer init
                var nautical = L.tileLayer.wms("http://egisws02.nos.noaa.gov/ArcGIS/services/RNC/NOAA_RNC/ImageServer/WMSServer", {
                    format: 'img/png',
                    transparent: true,
                    layers: null,
                    attribution: "NOAA Nautical Charts"
                });

                var bing = new L.BingLayer("Av8HukehDaAvlflJLwOefJIyuZsNEtjCOnUB_NtSTCwKYfxzEMrxlKfL1IN7kAJF", {
                    type: "AerialWithLabels"
                });

                // Map init
                var initPoint = new L.LatLng(18.35, -64.85);
                if (scope.question.lat && scope.question.lng) {
                    initPoint = new L.LatLng(scope.question.lat, scope.question.lng);
                }
                var initialZoom = 11;
                if (scope.question.zoom) {
                    initialZoom = scope.question.zoom;
                }
                var map = new L.Map($el, {
                    inertia: false
                }).addLayer(bing).setView(initPoint, initialZoom);

                map.attributionControl.setPrefix('');
                map.zoomControl.options.position = 'bottomleft';

                // Layer picker init
                var baseMaps = { "Satellite": bing, "Nautical Charts": nautical };
                var options = { position: 'bottomleft' };
                L.control.layers(baseMaps, null, options).addTo(map);

                var isLayerSelected = function (layer) {
                    return layer.options.fillOpacity !== 0;
                }; 

                var selectLayer = function (layer) {
                    if (!isLayerSelected(layer)) {
                        var id = layer.feature.properties.ID;
                        layer.setStyle( {
                            fillOpacity: .6
                        });
                        scope.question.answer.push({
                            id: id,
                            uuid: $routeParams.uuidSlug, 
                            qSlug: scope.question.slug
                        });
                        scope.selectionCount++;
                    }
                };
                
                var deselectLayer = function (layer) {
                    if (isLayerSelected(layer)) {
                        var id = layer.feature.properties.ID;
                        layer.setStyle({
                            fillOpacity: 0
                        });
                        scope.question.answer = _.reject(scope.question.answer, function(item) {
                            return item.id == id; 
                        });
                        scope.selectionCount--;
                    }
                };

                var layerClick = function(layer) {
                    isLayerSelected(layer) ?
                        deselectLayer(layer) :
                        selectLayer(layer);
                }

                scope.deselectAllPolygons = function () {
                    _.each(scope.allPloygons, function (layer) {
                        deselectLayer(layer);
                    });
                };

                scope.selectAllPolygons = function () {
                    _.each(scope.allPloygons, function (layer) {
                        selectLayer(layer);
                    });
                };
                
                // Add planning units grid
                $http.get("/static/survey/data/CentralCalifornia_PlanningUnits.json").success(function(data) {
                    var geojsonLayer = L.geoJson(data, { 
                        style: function(feature) {
                            return {
                                "color": "#E6D845",
                                "weight": 1,
                                "opacity": 0.6,
                                "fillOpacity": 0.0
                            };
                        },
                        onEachFeature: function(feature, layer) {
                            var id = layer.feature.properties.ID,
                                item = _.find(scope.question.answer, function(item) {
                                    return item.id == id;
                                });
                            if (item !== undefined) {
                                layer.setStyle( {
                                    fillOpacity: .6
                                });
                            }
                            layer.on("click", function (e) {
                                scope.$apply(function () {
                                    layerClick(layer);                                    
                                });
                            });
                            scope.allPloygons.push(layer);
                        }
                    });
                    geojsonLayer.addTo(map);
                });
                
                $('.leaflet-label').removeClass('leaflet-label-right');

                
                scope.hoverLatLng = null;

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

                scope.onBaseLayerChange = function (e /*Leavelet LayersControlEvent*/) {
                    var colors = [];
                    colors['Nautical Charts'] = 'blue';//'#005072';
                    colors['Satellite'] = '#E6D845';
                    colors[e.name]

                    var style = {
                        "color": colors[e.name],
                    }

                    _.each(scope.allPloygons, function (layer) {
                        layer.setStyle(style);
                    });                    
                };

                map.on('mousemove', scope.onMouseMove);
                map.on('mouseout', scope.onMouseOut);
                map.on('baselayerchange', scope.onBaseLayerChange);

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
            }
        }
    });