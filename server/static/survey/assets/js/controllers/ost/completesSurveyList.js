//'use strict';

angular.module('askApp')
    .controller('completesSurveyListCtrl', function($scope, $http, $routeParams, $location, survey, history) {
        $http.defaults.headers.post['Content-Type'] = 'application/json';

        if (app.user) {
            $scope.user = app.user;
        } else {
            $location.path('/');
        }

        $scope.showErrorMessage = false;
        $scope.path = $location.path().slice(1,5);
        $scope.viewPath = app.viewPath;
        $scope.showSurveyList = false;

        $scope.updateSurveyList = function() {
            $scope.updateEnabled = false;

            $scope.getSubmittedSurveysList($scope.surveyFilter);
        };
        
        $scope.getTitle = function() {
            return history.getTitle($scope.respondent);
        };

        $scope.getAnswer = function(questionSlug) {
            return history.getAnswer(questionSlug, $scope.respondent);
        };


        // $scope.deleteRespondent = function (respondent) {
        //     $scope.respondents = _.without($scope.respondents, respondent);
        //     $scope.saveState();
        //     $location.path('/respondents');
        // };

        $scope.gotoRespondentDetail = function (respondent) {
            $location.path(['/completes', respondent.survey_slug, respondent.uuid].join('/'));
        };

        $scope.closeRespondents = function () {
            _.each($scope.respondentList, function(respondent, index) {
                respondent.open = false;
            });
        }

        $scope.openRespondent = function (respondent) {
            if (respondent.open) {
                respondent.open = false;
            } else {
                $scope.closeRespondents();
                $scope.respondent = respondent;
                $scope.getRespondent(respondent);
                respondent.open = true;
            }
            // respondent.open = !respondent.open;
        };

        $scope.getRespondent = function (respondent) {
            var url = app.server 
                  + '/api/v1/reportrespondantdetails/'
                  + respondent.uuid 
                  + '/?format=json';        

            return $http.get(url)
                .success(function (data) {
                    var respondent = data;
                    if (typeof(respondent.responses.question) !== 'string') {
                        _.each(respondent.responses, function(response, index) {
                            var questionSlug = response.question.slug;
                            try {
                                answer_raw = JSON.parse(response.answer_raw);
                            } catch(e) {
                                console.log('failed to parse answer_raw');
                                answer_raw = response.answer;
                            }
                            response.question = questionSlug;
                            response.answer = answer_raw;
                        });
                    }
                    respondent.survey = respondent.survey_slug;
                    $scope.respondent = respondent;
                }).error(function (err) {
                    console.log(JSON.stringify(err));
                    debugger;
                }); 
        };

        $scope.getSubmittedSurveysListFromServer = function(surveyFilter) {
            var url = $scope.next20 ? $scope.next20 : 
                      app.server 
                      + '/api/v1/completerespondant/?user__username__exact=' 
                      + $scope.user.username 
                      + '&format=json';
            
            if (surveyFilter.start) {
                url += '&ts__gte=' + surveyFilter.start; //new Date(surveyFilter.start).add(1).days().toString('yyyy-MM-dd');
            }
            if (surveyFilter.end) {

                url += '&ts__lte=' + new Date(surveyFilter.end).add(2).days().toString('yyyy-MM-dd');
            }

            return $http.get(url).error(function (err) {
                console.log(JSON.stringify(err));
                debugger;
            }).success(function (callback) { $scope.next20 = callback.meta.next; $scope.updateEnabled = false;  });  
        };

        $scope.showNext20 = function(surveyFilter) {
            $scope.gettingNext20 = true;
            $scope.getSubmittedSurveysListFromServer(surveyFilter)
                .success(function (data) {
                    _.each(data.objects, function(respondent, index) {
                        try {
                            respondent.survey = respondent.survey_slug;
                            respondent.open = false;
                            $scope.respondentList.push(respondent);
                        }
                        catch(e) {
                            debugger;
                        }
                    });
                    $scope.gettingNext20 = true;
                    // console.log($scope.respondentList);
                }).error(function (data) {
                    debugger;
                }); 
        };

        $scope.getSubmittedSurveysList = function(surveyFilter) {

            $scope.showSurveyList = false;

            $scope.getSubmittedSurveysListFromServer(surveyFilter)
                .success(function (data) {
                    $scope.respondentList = [];
                    _.each(data.objects, function(respondent, index) {
                        try {
                            respondent.survey = respondent.survey_slug;
                            respondent.open = false;
                            $scope.respondentList.push(respondent);
                        }
                        catch(e) {
                            debugger;
                        }
                    });
                    $scope.showSurveyList = true;
                    // console.log($scope.respondentList);
                }).error(function (data) {
                    debugger;
                }); 

        };

        $scope.getSubmittedSurveys = function () {
            var url = app.server 
                      + '/api/v1/completerespondant/?user__username__exact=' 
                      + $scope.user.username 
                      + '&format=json';
            
            $scope.loading = true;

            return $http.get(url).error(function (err) {
                console.log(JSON.stringify(err));
                debugger;
            });
            
        };       


        $scope.showSubmittedSurveys = function() {
            
            $scope.getSubmittedSurveys()
                .success(function (data) {
                    //debugger;
                    $scope.respondentList = [];
                    _.each(data.objects, function(respondent, index) {
                        try {
                            if (typeof(respondent.responses.question) !== 'string') {
                                _.each(respondent.responses, function(response, index) {
                                    var questionSlug = response.question.slug;
                                    try {
                                        answer_raw = JSON.parse(response.answer_raw);
                                        // console.log('parsed answer_raw: ' + answer_raw);
                                    } catch(e) {
                                        console.log('failed to parse answer_raw');
                                        answer_raw = response.answer;
                                    }
                                    response.question = questionSlug;
                                    response.answer = answer_raw;
                                });
                            }
                            respondent.survey = respondent.survey_slug;
                            respondent.open = false;
                            $scope.respondentList.push(respondent);
                        }
                        catch(e) {
                            debugger;
                        }
                    });

                    $scope.loading = false;

                    //$scope.respondent = respondent;
                    $scope.showingSubmittedSurveys = true;
                }).error(function (data) {
                    debugger;
                });    
        };


        $scope.start_time = '2014-07-01';
        $scope.surveyFilter = {start: '2014-07-01', end: new Date().toString('yyyy-MM-dd')};
        $scope.getSubmittedSurveysList($scope.surveyFilter);

        $scope.$watch('surveyFilter', function(newValue) {
            if (newValue) {
                // $scope.getSubmittedSurveysList(newValue);
                $scope.updateEnabled = true;
            }
        }, true);
});