
angular.module('askApp').filter('titleCase', ['$filter', function($filter) {
    return function(input, options) {
        if (angular.isUndefined(input) || _.isNull(input)) return '';
        return _.string.titleize(input.toLowerCase());
    }
}])
.filter('to_trusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);