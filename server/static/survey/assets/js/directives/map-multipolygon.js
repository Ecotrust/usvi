angular.module('askApp').directive('map', function($http) {
    return {
        template: '<div class="map" style="height: 100%; width: 100%; position: fixed; margin-left: -50px; margin-top: -60px"></div>',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            question: "=question", //scope.question.geojson, scope.question.zoom, etc
            answers: "=answers",
            validity: "=validity"
        },
        link: function(scope, element) {
            if ( !scope.question.answer || !Array.isArray(scope.question.answer) ) {
                scope.question.answer = [];
            } else {
                console.log(scope.question.answer);
            }
            var $el = element[0];

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
                inertia: false,
                minZoom: 8,
                maxZoom: 13
            }).addLayer(bing).setView(initPoint, initialZoom);

            map.on('zoomend', function(e) {
                adjustLabelStyles();
            });

            map.attributionControl.setPrefix('');
            map.zoomControl.options.position = 'bottomleft';


            // Layer picker init
            var baseMaps = { "Satellite": bing }; //, "Nautical Charts": nautical };
            //var options = { position: 'topright' };
            //L.control.layers(baseMaps, null, options).addTo(map);

            var labelList = [];

            // used to account for display changes to account for varying zoom levels
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

            var layerClick = function(layer) {
                var id = layer.feature.properties.ID;

                if (layer.options.fillOpacity === 0) {                                  
                    layer.setStyle( {
                        fillOpacity: .6
                    });
                    scope.question.answer.push(id);

                    if (! layer.feature.label) {
                        createAndAddLabel(layer);
                    } else {
                        layer.feature.label.setOpacity(1);
                    }

                } else {
                    layer.setStyle( {
                        fillOpacity: 0
                    });

                    layer.feature.label.setOpacity(0);

                    scope.question.answer = _.without(scope.question.answer, id);
                }
                //scope.$apply();
                //console.log(scope.question.answer);
                //console.log(id);
            }

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
                
                layer.feature.label.on("click", function (e) {
                    layerClick(layer);
                });
            };
            
            //Fishing Areas Grid for St. Thomas
            if (scope.question.slug.indexOf('st-thomas') !== -1) {
                jsonPath = app.viewPath + "data/StThomas.json";
            } else if (scope.question.slug.indexOf('st-croix') !== -1) {
                jsonPath = app.viewPath +  "data/StCroix.json";
            } else {
                jsonPath = app.viewPath + "data/StThomas.json";
            }
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
                        if ( _.indexOf( scope.question.answer, layer.feature.properties.ID ) !== -1 ) {
                            layer.setStyle( {
                                fillOpacity: .6
                            });
                            createAndAddLabel(layer);
                        }
                        layer.on("click", function (e) {
                            layerClick(layer);
                        });

                    }
                });
                geojsonLayer.addTo(map);
            });

            scope.validateQuestion = function (question) {
                var overallValidity = question.answer && question.answer.length > 0 ? true : false;
                return overallValidity;
            };

            // the following only gets called when then map question loads and submits 
            // not sure why it doesn't fire when grid cells are clicked...
            scope.$watch('question.answer', function (newAnswer) {
                if (newAnswer) {
                    // scope.validity[scope.question.slug] = scope.validateQuestion(scope.question);    
                }
            });

            
            // not sure if this has any relevant effect any more...
            //$('.leaflet-label').removeClass('leaflet-label-right');


            /*  LEAVE IN PLACE -- MAY NEED TO CREATE NEW UTFGRIDS */
            // var labelLayer = L.tileLayer('http://tilestream.labs.ecotrust.org/1.0.0/USVI_Fishing_Grid_Labels_White/{z}/{x}/{y}.png', {
            //     minZoom: 11,
            //     maxZoom: 12
            // });
            // labelLayer.getTileUrl = function(tilePoint){
            //     var subdomains = this.options.subdomains,
            //         s = this.options.subdomains[(tilePoint.x + tilePoint.y) % subdomains.length],
            //         zoom = this._getZoomForUrl();
                
            //     return_url = this._url
            //         .replace('{s}', s)
            //         .replace('{z}', zoom)
            //         .replace('{x}', tilePoint.x)
            //         .replace('{y}', Math.pow(2,zoom) - tilePoint.y -1);
            //     //console.debug("url = " + return_url + " & x, y, z = " + tilePoint.x+","+tilePoint.y+","+zoom)
            //     return return_url;
            // };
            // labelLayer.setZIndex(300);

        }
    }
});