angular.module('askApp').directive('dashMap', function($http, $timeout) {
    return {
        template: '<div class="map-container"><div ng-show="spinner" class="spinner-cover"></div><div ng-show="spinner" class="spinner-container"><i class="icon-spinner icon-spin"></i></div><div class="map" style="height: 300px; width: 100%;"></div></div>',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            islands: "=islands",
            geojson: "=",
            locations: "=locations",
            zoom: "=",
            dash: "="
        },
        link: function(scope, element) {
            var $el = element[0];
            scope.spinner = true;
            // Layer init
            var nautical = L.tileLayer.wms("http://egisws02.nos.noaa.gov/ArcGIS/services/RNC/NOAA_RNC/ImageServer/WMSServer", {
                format: 'img/png',
                transparent: true,
                layers: null,
                attribution: "NOAA Nautical Charts"
            });
            
            var labelList = [];

            var bing = new L.BingLayer("Av8HukehDaAvlflJLwOefJIyuZsNEtjCOnUB_NtSTCwKYfxzEMrxlKfL1IN7kAJF", {
                type: "AerialWithLabels"
            });


            // Map init
            var initPoint = new L.LatLng(18.2, -64.8);
            var initialZoom = 10;
            var map = new L.Map($el, {
                inertia: false,
                minZoom: 1,
                maxZoom: 14
            }).addLayer(bing).setView(initPoint, initialZoom);

            map.attributionControl.setPrefix('');
            map.zoomControl.options.position = 'bottomleft';
            scope.$watch('zoom', function (newZoom) {
                if (newZoom) {
                    map.setZoom(newZoom);
                }
            });

            // Layer picker init
            var baseMaps = { "Satellite": bing }; //, "Nautical Charts": nautical };
            //var options = { position: 'topright' };
            //L.control.layers(baseMaps, null, options).addTo(map);
            var islands = {
                'stcroix': "data/StCroix.json",
                "stthomasstjohn": "data/StThomas.json",
                "puertorico": "data/puerto-rico.json",
                "St. Croix": "data/StCroix.json",
                "St. Thomas & St. John": "data/StThomas.json",
                "Puerto Rico": "data/puerto-rico.json",
            };


            
            
            
            var selectedLocations = L.featureGroup();
            var locations = L.featureGroup();
            selectedLocations.on('layeradd', function () {
                map.panTo(selectedLocations.getBounds().getCenter());
            });
            locations.on('layeradd', function () {
                map.panTo(locations.getBounds().getCenter());
            });
            _.each(scope.islands || [], function (island) {
                var jsonPath = app.viewPath + islands[island];
                $http.get(jsonPath).success(function(data) {
                    var geojsonLayer = L.geoJson(data, { 
                        style: function(feature) {
                            return {
                                "color": "#E6D845",
                                "weight": 1,
                                "opacity": scope.dash? 0: 0.6,
                                "fillOpacity": 0.0
                            };
                        },
                        onEachFeature: function(feature, layer) {
                            if ( _.contains(scope.locations, layer.feature.properties.ID) ) {
                                layer.setStyle( {
                                    fillOpacity: .6,
                                    opacity: .6
                                });
                                createAndAddLabel(layer);
                                selectedLocations.addLayer(layer);
                            }
                            // layer.on("click", function (e) {
                            //     // layerClick(layer);
                            // });

                        }
                    });
                    geojsonLayer.addTo(map);
                });
            })
            var geojsonLayer;
            var getGeoJson = function (url) {
                if (geojsonLayer) {
                    map.removeLayer(geojsonLayer);
                }
                
                $http.get(url).success(function(data) {
                    locations.clearLayers()
                    geojsonLayer = L.geoJson(data, { 
                        style: function(feature) {
                            return {
                                "color": "#E6D845",
                                "weight": 1,
                                "opacity": 0.6,
                                "fillOpacity": 0.0
                            };
                        },
                        onEachFeature: function(feature, layer) {
                            locations.addLayer(layer);
                            createAndAddLabel(layer);
                        }
                    });
                    geojsonLayer.addTo(map);
                });
            }
            
            scope.$watch('geojson', function () {
                if (scope.geojson) {
                    getGeoJson(scope.geojson);
                }    
            });
            var createAndAddLabel = function(layer) {
                layer.feature.label = new L.Label( {
                    offset: [-22, -15],
                    clickable: true,
                    opacity: 1
                });
                if (layer.feature.properties.ID) {
                    layer.feature.label.setContent(layer.feature.properties.ID.toString());    
                } else if (layer.feature.properties.id) {
                    layer.feature.label.setContent(layer.feature.properties.id.toString());    
                }

                layer.feature.label.setLatLng(layer.getBounds().getCenter());

                labelList.push(layer.feature.label);
                
                map.showLabel(layer.feature.label);

                adjustLabelStyles();
                
                // layer.feature.label.on("click", function (e) {
                //     layerClick(layer);
                // });
            };
            
            var adjustLabelStyles = function() {
                var zoom = map.getZoom(),
                    fontSize = 8 + ((zoom - 10)*4);
                    labelElems = document.getElementsByClassName("leaflet-label");

                // adjust font size (and hide altogether when zoomed out)
                _.each(labelElems, function(labelElem) {
                    labelElem.style.display = "block";
                    if (zoom > 9) {
                        labelElem.style.fontSize = fontSize + "px";    
                    } else {
                        labelElem.style.display = "none";
                    }
                }); 

                // adjust horizontal offset
                _.each(labelList, function(label) {
                    label.options.offset[0] = (map.getZoom() * -2) -3;
                    label._update();
                });                                
            }
            map.on('zoomend', function () {
                adjustLabelStyles();
            });
            // scope.$watch('locations', function (newValue) {
            //     console.log(newValue);
            // });
            $timeout(function () {
                map.invalidateSize(false);
                scope.spinner = false;
            }, 2000);
        }
    }
});