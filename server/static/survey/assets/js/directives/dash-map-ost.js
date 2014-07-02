angular.module('askApp').directive('dashMapOst', function($http, $compile, $timeout, $routeParams, survey) {

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
            markers = [],
            controls;

        scope.makersLayer = L.layerGroup();

        function init () {
            map = MapUtils.initMap(element[0].children[0].children[0],
                    scope.lat, scope.lng, scope.zoom);

            MapUtils.addBoundary(scope.boundaryPath, function (layer) {
                map.addLayer(layer)
                .on('dblclick', function(e) {
                    map.setZoom(map.getZoom() + 1);
                });
                layer.bringToBack();

                // Adding controls to L.controls
                map.controls.addOverlay(layer, 'Boundary');
            });
            
            MapUtils.addPlanningUnitGrid("/static/survey/data/CentralCalifornia_PlanningUnits.json", function (layer) {
                scope.puLayer = layer;
                map.addLayer(scope.puLayer)
                .on('dblclick', function(e) {
                    map.setZoom(map.getZoom() + 1);
                });
                scope.updatePuLayer();
                
                // Adding controls to L.controls
                map.controls.addOverlay(scope.puLayer, 'Planning Units');

            });


            scope.getLayerByID = function(layer, planningUnitId){
                pu = _.find(layer._layers, function(sublayer){
                    var id = parseInt(sublayer.feature.properties.ID, 10);
                    return id === planningUnitId;
                });
                return pu;
            };

            scope.setCellActive = function(unit){
                var id = unit
                pu = scope.getLayerByID(scope.puLayer, id);
                pu.setStyle(
                    {"color": '#00FF00',
                     "fillColor": '#00FF00',
                     "fillOpacity": 0.7}
                );

                setPuPopup(pu);
            };

            scope.showBoundary = true;
            scope.showPoints = true;
            scope.showUnits = false;
            scope.planningUnit = {data:
                                    {projects:[],
                                     id:null}
                                };


            scope.ecosystemLabelToSlug =function(label) {
                return survey.ecosystemLabelToSlug(label);
            };

            scope.ecosystemSlugToLabel = function(slug) {
                return survey.ecosystemSlugToLabel(slug);
            };

            scope.ecosystemSlugToColor = function (slug) {
                return survey.ecosystemSlugToColor(slug);
            };


            scope.$watch('points', function(newVal, oldVal) {
                // Clear scope.markersLayer
                if (scope.markersLayer){
                    map.removeLayer(scope.makersLayer);
                    scope.markersLayer.clearLayers();
                }

                if (newVal) {

                    if (_.find(map.controls._layers, function(l){return l.name === 'Points'}) ){
                        map.controls.removeLayer(scope.markersLayer);
                    }

                    // Add new markers to markersLayer
                    scope.markersLayer = addMarkers(newVal);

                    // Add to map and map controls
                    map.addLayer(scope.markersLayer);
                    scope.markersLayer.bringToFront();
                    map.controls.addOverlay(scope.markersLayer, 'Points');
                    
                }
            });

            scope.$watch('units', function(newVal, oldVal) {
                console.log("[$watch units] planning units changed");
                if (newVal){
                    scope.updatePuLayer();
                }
            });
        }

        function addMarkers(data){
            // Returns a LayerGroup containing all the markers.
            var out = L.featureGroup();
            _.each(data, function(markerData){
                markerData['draggable'] = false;
                markerData['color'] = scope.slugToColor({slug: markerData.qSlug});
                var marker = MapUtils.createMarker(markerData);
                if (marker) {
                    setPopup(marker, markerData);
                }
                out.addLayer(marker);
            });
            return out;
        };

        scope.updatePuLayer = function(){
            /*
            This clears and updated the cells based on the unit_id's in 
            scope.units.

            Call setCellActive to actaully activate the cell and set the popup.
            */
            try {
                scope.puLayer.bringToBack();
            } catch(e) {
                console.log(e);
                return;
            }

            // Turns off all cells
            _.each(scope.puLayer._layers, function(sublayer){
                sublayer.setStyle({
                    fillOpacity: 0,
                    color: '#E6D845'
                });
            });

            // Add opacity to active cells.
            _.each(scope.units, function(unit){
                scope.setCellActive(unit);
            });
        };


        function setPuPopup (layer){
            /*

            Sets a pop for this planning unit.

            planningUnit is an object returned from the planning-unit API resource
            */ 

            // Build popup based on the ajax data
            var loading = '<p ng-show="!planningUnit.data.id" class="load-indicator">Loading...</p>';
            var popup = '';
            var list = '';
        
            list += '<h4>Projects</h4>';            
            
            list += '<dl ng-cloak>'; 
            list += '<div ng-repeat="project in planningUnit.data.projects">';
            list += '<h5><a href="#/RespondantDetail/monitoring-project/{{project.project_uuid}}">{{project.project_name}}</a></h5>';
            list += '<dt>Ecosytem Features</dt>';
            
            list += '<dd><ul class="list-unstyled">';
            list += '<li ng-repeat="slug in project.ecosystem_features">';
            list += '<div class="circle margin-right" ng-style="{\'background-color\': ecosystemSlugToColor(slug)};">&nbsp;</div>{{ecosystemSlugToLabel(slug)}}';
            list += '</li>';
            list += '</ul></dd>';

            list += '</div>'; // End ng-repeat: planningUnit.data.projects
            list += '</dl>';

            var html = '<div class="popup-content planning-unit">' + loading + list + '</div>';

            console.log(html)
            layer.bindPopup(html, { closeButton: true });
            
            // Define the on click callback. 
            layer.on('click', function(e) {    
                var unit_id = e.target.feature.properties.ID;
                getPlanningUnit(unit_id, function(res){
                    scope.planningUnit.data = res;
                });

                if (map._popup) {
                    $compile(angular.element(map._popup._contentNode))(scope);
                }
            });
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

        function isLayerSelected (layer) {
            return layer.options.fillOpacity !== 0;
        }

        function selectLayer (layer) {
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
        }
        
        function deselectLayer (layer) {
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
        }

        function layerClick (layer) {
            isLayerSelected(layer) ?
                deselectLayer(layer) :
                selectLayer(layer);
        }

        function deselectAllPolygons () {
            _.each(scope.allPloygons, function (layer) {
                deselectLayer(layer);
            });
        }

        function selectAllPolygons () {
            _.each(scope.allPloygons, function (layer) {
                selectLayer(layer);
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
                debugger
            }); 
        }


        function getPlanningUnit (unit_id, success_callback) {
            var url = app.server 
                  + '/api/v1/planning-unit/'
                  + unit_id 
                  + '/?format=json';        

            $http.get(url).success(function (data) {
                success_callback(data);
            }).error(function (err) {
                debugger
            }); 
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
            options = { position: 'topright' };
            var controls = L.control.layers(baseMaps, null, options).addTo(map);
            map.controls = controls;

            return map;
        },

        addBoundary: function (geojsonPath, success_callback) {
            if (geojsonPath) {
                // Add study area boundary
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

        addPlanningUnitGrid: function (geojsonPath, success_callback) {
            // Add planning units grid with no borders from /static/survey/data/CentralCalifornia_PlanningUnits.json
            $http.get(geojsonPath).success(function(data) {
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
                        var id = layer.feature.properties.ID
                        //     item = _.find(scope.question.answer, function(item) {
                        //         return item.id == id;
                        //     });
                        // if (item !== undefined) {
                        //     layer.setStyle( {
                        //         fillOpacity: .6
                        //     });
                        // }
                        layer.on("click", function (e) {
                            console.log("Click layer "+id);
                            console.log(e)
                        });
                        // scope.allPloygons.push(layer);
                    }
                });
                success_callback(geojsonLayer);
            });
        },
        
        createMarker: function (config) {
            var marker = null;
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
