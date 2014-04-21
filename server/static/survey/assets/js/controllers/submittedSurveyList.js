(function() {
    'use strict';
    angular.module('askApp')
        .controller('submittedSurveyListCtrl', function($scope, $http, $routeParams, $location, survey, history) {
            $http.defaults.headers.post['Content-Type'] = 'application/json';

            $scope.respondents = _.toArray(app.respondents);
            $scope.respondentIndex = app.respondents;
            if (app.user) {
                $scope.user = app.user;
            } else {
                $location.path('/');
            }
            $scope.showErrorMessage = false;

            $scope.path = $location.path().slice(1, 5);
            $scope.viewPath = app.viewPath;

            if ($routeParams.uuidSlug) {
                $scope.respondent = $scope.respondentIndex[$routeParams.uuidSlug];

                _.each($scope.respondent.responses, function(response) {
                    if (response.question.grid_cols) {
                        _.each(response.question.grid_cols, function(grid_col) {
                            grid_col.label = grid_col.label.replace(/-/g, '');
                        });
                    }
                });
            }
            $http.get(app.server + '/reports/respondants_summary')
                .success(function(data) {
                    var date = new Date(),
                        today = date.toString('yyyy-MM-dd');
                    $scope.start_time = data.start_time;
                    $scope.surveyFilter = {
                        start: data.start_time,
                        end: today
                    };
                    $scope.getSubmittedSurveysList($scope.surveyFilter);
                }).error(function () {
                    $scope.showSurveyList = false;
                    $scope.showErrorMessage = true;
                });

            $scope.$watch('surveyFilter', function(newValue) {
                if (newValue) {
                    // $scope.getSubmittedSurveysList(newValue);
                    $scope.updateEnabled = true;
                }
            }, true);

            $scope.showSurveyList = false;


            $scope.ackNotification = function (respondent) {
                respondent.spin = true;

                return $http({
                    url: respondent.resource_uri.replace('reportrespondant', 'offlinerespondant'),
                    data: { 'notify_seen_at': new Date() },
                    method: 'PATCH'
                })
                    .success(function(data) {
                        respondent.spin = false;
                        respondent.notify_seen_at = data.notify_seen_at;
                    })
                    .error(function(err) {
                        // TraceKit.report({message: err});
                        console.log('error');
                    });
            };

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


            $scope.gearTypeIncludes = function(type) {
                return history.gearTypeIncludes(type, $scope.respondent);
            };

            $scope.trapTypeIncludes = function(type) {
                return history.trapTypeIncludes(type, $scope.respondent);
            };


            $scope.deleteRespondent = function(respondent) {
                $scope.respondents = _.without($scope.respondents, respondent);
                $scope.saveState();
                $location.path('/respondents');
            };


            $scope.closeRespondents = function() {
                _.each($scope.respondentList, function (respondent, index) {
                    respondent.open = false;
                });
            };

            $scope.openRespondent = function(respondent) {
                if (respondent.open) {
                    respondent.open = false;
                } else {
                    $scope.closeRespondents();
                    $scope.respondent = respondent;
                    $scope.getRespondent($scope.respondent);

                // respondent.open = !respondent.open;
                }
            };

            $scope.getRespondent = function(respondent) {
                var url = app.server + '/api/v1/reportrespondantdetails/' + respondent.uuid + '/?format=json';
                if (respondent.getting) {
                    return;
                } else {
                    respondent.getting = true;
                }
                if (_.isObject(respondent.responses[0])) {
                    $scope.respondent.open = true;
                    $scope.respondent.getting = false;
                    return true;
                } else {
                    return $http.get(url)
                        .success(function(data) {

                            var respondent = data;
                            respondent.survey = respondent.survey_slug;
                            console.log('getting responses')
                            _.each(respondent.responses, function(response, index) {
                                var questionSlug = response.question.slug, answer_raw;
                                try {
                                    answer_raw = JSON.parse(response.answer_raw);
                                } catch (e) {
                                    console.log('failed to parse answer_raw');
                                    answer_raw = response.answer;
                                }
                                response.question = questionSlug;
                                response.answer = answer_raw;
                            });
                            $scope.respondent.responses = respondent.responses;
                            $scope.respondent.open = true;
                            $scope.respondent.getting = false;
                        }).error(function(err) {
                            console.log(JSON.stringify(err));
                        });
                }
            };

            $scope.getSubmittedSurveysListFromServer = function(surveyFilter) {
                var url = $scope.next20 ? $scope.next20 :
                    app.server + '/api/v1/reportrespondant/?user__username__exact=' + $scope.user.username + '&format=json';

                if (surveyFilter.start) {
                    url += '&ordering_date__gte=' + surveyFilter.start;
                }
                if (surveyFilter.end) {
                    url += '&ordering_date__lte=' + new Date(surveyFilter.end).add(1).days().toString('yyyy-MM-dd');
                }

                return $http.get(url).error(function(err) {
                    console.log(JSON.stringify(err));
                }).success(function(callback) {
                    $scope.next20 = callback.meta.next;
                    $scope.updateEnabled = false;
                });
            };

            $scope.showNext20 = function(surveyFilter) {
                $scope.gettingNext20 = true;
                $scope.getSubmittedSurveysListFromServer(surveyFilter)
                    .success(function(data) {
                        _.each(data.objects, function(respondent, index) {
                            try {
                                respondent.survey = respondent.survey_slug;
                                respondent.open = false;
                                $scope.respondentList.push(respondent);
                            } catch (e) {
                                debugger;
                            }
                        });
                        $scope.gettingNext20 = false;
                        // console.log($scope.respondentList);
                    }).error(function(data) {
                        debugger;
                    });
            };

            $scope.getSubmittedSurveysList = function(surveyFilter) {

                $scope.showSurveyList = false;

                $scope.getSubmittedSurveysListFromServer(surveyFilter)
                    .success(function(data) {
                        $scope.respondentList = [];
                        _.each(data.objects, function(respondent, index) {
                            try {
                                respondent.survey = respondent.survey_slug;
                                respondent.open = false;
                                $scope.respondentList.push(respondent);
                            } catch (e) {
                                debugger;
                            }
                        });
                        $scope.showSurveyList = true;
                        // console.log($scope.respondentList);
                    }).error(function(data) {
                        debugger;
                    });

            };

            $scope.getSubmittedSurveys = function() {
                var url = app.server + '/api/v1/reportrespondant/?user__username__exact=' + $scope.user.username + '&format=json';

                $scope.loading = true;

                return $http.get(url).error(function(err) {
                    console.log(JSON.stringify(err));
                });

            };


            $scope.showSubmittedSurveys = function() {

                $scope.getSubmittedSurveys()
                    .success(function(data) {
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
                                        } catch (e) {
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
                            } catch (e) {
                                debugger;
                            }
                        });

                        $scope.loading = false;

                        //$scope.respondent = respondent;
                        $scope.showingSubmittedSurveys = true;
                    }).error(function(data) {
                        debugger;
                    });
            };

            //$scope.getSubmittedSurveysList();

        });

})();