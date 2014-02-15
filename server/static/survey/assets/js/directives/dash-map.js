angular.module('askApp').directive('dashMap', function($http, $timeout) {
    return {
        template: '<div class="map-container"><div ng-show="spinner" class="spinner-cover"></div><div ng-show="spinner" class="spinner-container"><i class="icon-spinner icon-spin"></i></div><div class="map" style="height: 300px; width: 100%;"></div></div>',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            island: "=island",
            locations: "=locations"

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
            var initPoint = new L.LatLng(18.35, -64.85);
            var initialZoom = 11;
            var map = new L.Map($el, {
                inertia: false,
                minZoom: 8,
                maxZoom: 13
            }).addLayer(bing).setView(initPoint, initialZoom);

            map.attributionControl.setPrefix('');
            map.zoomControl.options.position = 'bottomleft';


            // Layer picker init
            var baseMaps = { "Satellite": bing }; //, "Nautical Charts": nautical };
            //var options = { position: 'topright' };
            //L.control.layers(baseMaps, null, options).addTo(map);
            if (scope.island === 'St. Thomas') {
                jsonPath = app.viewPath + "data/StThomas.json";
            } else if (scope.island === 'St. Croix') {
                jsonPath = app.viewPath +  "data/StCroix.json";
            } else {
                jsonPath = app.viewPath + "data/StThomas.json";
            }
            var selectedLocations = L.featureGroup();
            selectedLocations.on('layeradd', function () {
                map.panTo(selectedLocations.getBounds().getCenter());
            });
            $http.get(jsonPath).success(function(data) {
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
                        if ( _.contains(scope.locations, layer.feature.properties.ID) ) {
                            layer.setStyle( {
                                fillOpacity: .6
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
            var createAndAddLabel = function(layer) {
                layer.feature.label = new L.Label( {
                    offset: [-22, -15],
                    clickable: true,
                    opacity: 1
                });
                layer.feature.label.setContent(layer.feature.properties.ID.toString());
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
                    if (zoom > 10) {
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

            scope.$watch('locations', function (newValue) {
                console.log(newValue);
            });
            $timeout(function () {
                map.invalidateSize(false);
                scope.spinner = false;
            }, 2000);
        }
    }
});