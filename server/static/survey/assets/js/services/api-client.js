(function() {
    'use strict';

    angular.module('askApp')
        .factory('api', function($http, $location, $q) {
            
            var base_uri = '/api/v1/';

            function fetch(resource, params){
                if (typeof(params) === 'undefined') {
                    params = {};
                }
                var uri = base_uri + resource;
                var prefix = '/?format=json&';
                _.each(params, function(val, key){
                    uri += prefix+key+'='+val;
                    prefix = '&';
                });
                console.log('Fetching '+uri);
                return $http.get(uri);
            }

            return {
                fetch:fetch
            };

        }); // End factory


})();

