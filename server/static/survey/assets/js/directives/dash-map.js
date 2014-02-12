angular.module('askApp').directive('dashMap', function($http, $timeout) {
    return {
        template: '<div class="map" style="height: 300px; width: 100%;"></div>',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {

        },
        link: function(scope, element) {
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


            //Fishing Areas Grid for St. Thomas
            // if (scope.question.slug.indexOf('st-thomas') !== -1) {
            //     jsonPath = app.viewPath + "data/StThomas.json";
            // } else if (scope.question.slug.indexOf('st-croix') !== -1) {
            //     jsonPath = app.viewPath +  "data/StCroix.json";
            // } else {
            //     jsonPath = app.viewPath + "data/StThomas.json";
            // }
            // $http.get(jsonPath).success(function(data) {
            //     var geojsonLayer = L.geoJson(data, { 
            //         style: function(feature) {
            //             return {
            //                 "color": "#E6D845",
            //                 "weight": 1,
            //                 "opacity": 0.6,
            //                 "fillOpacity": 0.0
            //             };
            //         },
            //         onEachFeature: function(feature, layer) {
            //             if ( _.indexOf( scope.question.answer, layer.feature.properties.ID ) !== -1 ) {
            //                 layer.setStyle( {
            //                     fillOpacity: .6
            //                 });
            //                 createAndAddLabel(layer);
            //             }
            //             layer.on("click", function (e) {
            //                 layerClick(layer);
            //             });

            //         }
            //     });
            //     geojsonLayer.addTo(map);
            // });


            $timeout(function () {
                map.invalidateSize(false);
            }, 2000);
        }
    }
});