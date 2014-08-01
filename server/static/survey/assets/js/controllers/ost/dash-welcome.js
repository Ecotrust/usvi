
angular.module('askApp').controller('DashWelcomeCtrl', function($scope, $routeParams, $window, surveyFactory) {
    
    //$scope.screen_height = angular.element($window).height();
    $scope.page_title = "Welcome!";
    $scope.activePage = 'welcome';
    $scope.user = app.user || {};
    $scope.filters = {};
    $scope.filtersJson = '';

    $scope.survey = {};
    $scope.survey.slug = $routeParams.survey_slug;

    $scope.survey.loading = true;
    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });
    

    $scope.search = function(searchTerm){
        surveyFactory.searchRespondants(searchTerm);
    };

});
