
angular.module('askApp').controller('DashWelcomeCtrl', function($scope, surveyFactory) {
    
    $scope.activePage = 'welcome';
    $scope.user = app.user || {};
    $scope.filters = {};
    $scope.filtersJson = '';

    $scope.survey = {}
    $scope.survey.loading = true;
    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });

    

    $scope.search = function(searchTerm){
        surveyFactory.searchRespondants(searchTerm);
    };
});
