/* global app: true */

(function() {
    'use strict';
    angular.module('askApp')
        .controller('SurveyDetailCtrl', function($scope, $routeParams, $http, $location, $dialog, $interpolate, $timeout, survey, storage) {
            // $('#wrap').css({ 'min-height': initialHeight -80});
            // $('#wrap').css({ 'min-height': initialHeight -80});
            // $(window).on('resize', function () {
            //     $('#wrap').css({ 'min-height': $(window).height() -80});
            // })
            $scope.loading = true;
            $scope.path = $location.path().slice(1, 5);
            if (app.user) {
                $scope.user = app.user;
            } else if (app.offline) {
                if (!app) {
                    app = {};
                }
                app.next = $location.path();
                $location.path('/');
                return false;
            }

            $scope.survey = {
                state: 'loading'
            };
            $scope.dash = app.dash;

            $scope.answers = {};

            $scope.isAuthenticated = isAuthenticated;

            // landing page view
            $scope.landingView = 'survey-pages/' + $routeParams.surveySlug + '/landing.html';

            // $scope.getPageFromQuestion = function(questionSlug) {
            //     return _.find($scope.survey.pages, function (page) {
            //         return _.findWhere(page.questions, {slug: questionSlug});
            //     });
            // };

            $scope.getResumeQuestionPath = function(lastQuestion) {

                var resumeQuestion = $scope.survey.questions[_.indexOf($scope.survey.questions, _.findWhere($scope.survey.questions, {
                    slug: lastQuestion
                })) + 1];
                return ['survey', $scope.survey.slug, resumeQuestion.slug, $routeParams.uuidSlug].join('/');
            };

            // $scope.getResumePage = function (lastQuestion) {
            //     var resumePage = survey.getPageFromQuestion(lastQuestion);
            //     return ['survey', $scope.survey.slug, resumePage.order, $routeParams.uuidSlug].join('/');
            // }
            $scope.showFeedback = true;
            $scope.sendingFeedback = false;
            $scope.submitFeedback = function(feedback) {
                var url = app.server + '/account/sendFeedback';
                $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

                $http({
                    method: 'POST',
                    url: url,
                    data: {
                        feedback: feedback,
                        username: app.user.username
                    }
                }).success(function() {
                    $scope.feedback = null;
                });
                $scope.sendingFeedback = false;
            };

            $scope.terminateIf = function(answer, condition) {
                var op = condition[0],
                    testCriteria = condition.slice(1),
                    terminate = false;

                if (op === '<') {
                    terminate = answer < testCriteria;
                } else if (op === '>') {
                    terminate = answer > testCriteria;
                } else if (op === '=') {
                    terminate = answer === testCriteria;
                }
                return terminate;
            };

            $scope.deleteAnswer = function(questionSlug, uuidSlug) {
                var index;

                if (app.offline) {
                    if ($scope.answers[questionSlug]) {
                        delete $scope.answers[questionSlug];
                    }
                    // _.each(app.respondents[uuidSlug].responses, function (response, i) {
                    //     if (response.question === questionSlug) {
                    //         index = i;
                    //     }
                    // });
                    for (var i = 0; i < app.respondents[uuidSlug].responses.length; i += 1) {
                        if (app.respondents[uuidSlug].responses[i].question === questionSlug) {
                            index = i;
                            break;
                        }
                    }
                    if (index) {
                        app.respondents[uuidSlug].responses.splice(index, 1);
                    }
                    storage.saveState(app);
                }
            };

            $scope.answerOffline = function(answer) {
                $scope.deleteAnswer(answer.question.slug, $routeParams.uuidSlug);

                app.respondents[$routeParams.uuidSlug].responses.push({
                    answer: answer.answer,
                    question: answer.question.slug
                });
                if (answer.question.attach_to_profile || answer.question.persistent) {
                    if (!app.user.registration) {
                        app.user.registration = {};
                    }
                    app.user.registration[answer.question.slug] = answer.answer;
                }

                app.respondents[$routeParams.uuidSlug].resumePath = app.user.resumePath = window.location.hash;
                $scope.answers[answer.question.slug] = answer;
                storage.saveState(app);
            };

            $scope.getQuestionBySlug = function(slug) {
                return _.findWhere($scope.page.questions, {
                    slug: slug
                });
            };

            $scope.getPageBlockTitle = function() {
                var title = '';
                if (!$scope.page) {
                    return title;
                }
                _.each($scope.page.blocks, function(block, i) {
                    if (title === '') {
                        title = block.name;
                    } else {
                        title = title + " - " + block.name;
                    }

                });
                return title;
            };

            $scope.submitPageNew = function(page) {
                if (!$scope.pageIsValid) {
                    return false;
                }
                var answers = _.map(page.questions, function(question) {
                    return $scope.getAnswerOnPage(question);
                });
                console.log(answers)

                $('#footer').attr('style', null);
                if (app.offline) {
                    _.each(answers, function(answer) {
                        $scope.answerOffline(answer);
                    });
                    $scope.gotoNextPage();
                } else {
                    survey.sendResponses(answers, $routeParams.uuidSlug)
                        .then(function(rs) {
                            // Update app.data with reposnes, if these are new, this is where the resource_uri is add
                            if (!app.data.responses) {
                                app.data.responses = [];
                            }

                            _.each(rs, function(obj){

                                var response = obj.data;
                                // Update in memory answers 
                                var question = $scope.getQuestionBySlug(response.question.slug);
                                $scope.answers[response.question.slug] = response.answer; // Update answer

                                // update user profile with first and last name,
                                if ((question.attach_to_profile || question.persistent) && app.offline) {
                                    app.user.registration[response.question.slug] = response.answer;
                                }

                                // Create responses array if it doesn't exist.
                                if (!app.data.responses) {
                                    app.data.responses = [];
                                }

                                // finally update app.data.repsonses
                                survey.updateResponse(response);
                            });

                            $scope.gotoNextPage();
                        });
                }

            };

            $scope.submitPage = function(page) {
                if (!$scope.pageIsValid) {
                    return false;
                }
                var answers = _.map(page.questions, function(question) {
                    return $scope.getAnswerOnPage(question);
                });

                var stale_questions;

                if (app.offline) {
                    _.each(answers, function(answer) {
                        $scope.answerOffline(answer);
                    });
                    $scope.gotoNextPage();
                } else {
                    stale_questions = survey.getStaleResponses($scope.answers);
                    _.each(stale_questions, function (q) {
                        delete $scope.answers[q];
                    });
                    $http({
                        url: ['/respond/submitPage', $scope.survey.slug, $routeParams.uuidSlug].join('/'),
                        method: 'POST',
                        data: {
                            'answers': _.map(answers, function(answer) {
                                return {
                                    slug: answer.question.slug,
                                    answer: answer.answer
                                };
                            }),
                            'stale_questions': stale_questions
                        },
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }).success(function(response, status, getHeaders, request) {
                        _.each(request.data.answers, function(answer) {
                            var question = $scope.getQuestionBySlug(answer.slug);
                            $scope.answers[answer.slug] = answer.answer;

                            // update user profile
                            if ((question.attach_to_profile || question.persistent) && app.offline) {
                                app.user.registration[answer.question.slug] = answer.answer;
                            }
                            if (!app.data.responses) {
                                app.data.responses = [];
                            }

                            app.data.responses.push({
                                answer: answer.answer,
                                question: question.slug
                            });
                        });
                        $scope.gotoNextPage();
                    });
                }

            };


            $scope.gotoNextPage = function() {

                var nextPage = survey.getNextPage($scope.survey.pages.length);
                if (nextPage) {
                    $location.path(['survey', $scope.survey.slug, nextPage.order, $routeParams.uuidSlug].join('/'));
                } else {
                    if (app.data && app.data.meta.is_impersonated) {
                        $location.path(['survey', $scope.survey.slug, 'complete', $routeParams.uuidSlug, 'done-impersonating'].join('/'));
                    } else {
                        $location.path(['survey', $scope.survey.slug, 'complete', $routeParams.uuidSlug, $routeParams.action].join('/'));
                    }

                }

            };

            $scope.gotoLastPage = function() {
                $location.path(['survey', $scope.survey.slug, $scope.page.order - 1, $routeParams.uuidSlug].join('/'));
            };


            $scope.getAnswerOnPage = function(question) {
                var answer = question.answer;

                //var url = ['/respond/answer', survey.slug, $routeParams.questionSlug, $routeParams.uuidSlug].join('/');
                if (question.type === 'timepicker' || question.type === 'datepicker' || question.type === 'monthpicker') {
                    if (!answer) {
                        answer = new Date();
                    }
                }

                if (question.type === 'multi-select') {
                    answer = $scope.answerMultiSelect(question);
                }

                if (question.type === 'single-select' || question.type === 'yes-no') {
                    answer = $scope.answerSingleSelect(question);
                }

                // sometimes we'll have an other field with option text box
                // if (answer === 'other' && question.otherAnswer) {
                //     answer = question.otherAnswer;
                // }


                // for number with unit questions, we need to submit a unit as well
                if (question.type === 'number-with-unit') {
                    answer = {
                        value: question.answer,
                        unit: question.unit
                    }
                }

                if (question.type === 'grid') {
                    //check for undefined answers on the grid
                    //var completed = ! _.some( _.map(question.options, function(option) { return _.contains(_.values(option), undefined); }));
                    var completed = $scope.validateGridQuestion(question);
                    if (completed || !question.required) {
                        answer = question.answer;
                    } else {
                        return false;
                    }
                }

                if (answer === 'other' && question.otherAnswers.length) {
                    answer = question.otherAnswers[0];
                }
                if (question.required && (answer === undefined || answer === null)) {
                    return false;
                } else if (!question.required && (answer === undefined || answer === null)) {
                    answer = '';
                }

                if (answer !== 0 && !answer) {
                    answer = "NA";
                }

                return {
                    question: question,
                    answer: answer
                };
            };

            // might be better to use the validateQuestion in the Grid Question directive...but this will have to do for now...
            $scope.validateGridQuestion = function(question) {
                return true;
                var overallValidity = true,
                    currentRow;
                _.each(question.options, function(row) {
                    currentRow = row;
                    _.each(question.grid_cols, function(col) {
                        var answer = currentRow[col.label];
                        if (col.required && !answer) {
                            if (col.either_or && !currentRow[col.either_or]) {
                                overallValidity = false;
                            }

                        }
                    });
                });
                return overallValidity;
            }

            $scope.validateMultiSelect = function(question) {
                var hoistedAnswers,
                    answers,
                    isOtherAnswerValid = true;

                if (!question.required) {
                    return true;
                }

                answers = _.filter(question.options, function(option) {
                    return option.checked;
                });

                // in case of multiselect containing groups
                if (question.groupedOptions && question.groupedOptions.length) {
                    answers = [];
                    _.each(question.groupedOptions, function(groupedOption) {
                        answers = answers.concat(_.filter(groupedOption.options, function(option) {
                            return option.checked;
                        }));
                    });
                }

                if (question.hoisted_options) {
                    hoistedAnswers = _.filter(question.hoisted_options, function(option) {
                        return option.checked;
                    });
                    answers = answers.concat(hoistedAnswers);
                }

                if (question.allow_other && question.otherOption && question.otherOption.checked) {
                    // if (question.allow_other) {
                    // if (question.otherAnswer === null || question.otherAnswer.length < 1) {
                    //     // other answer is blank, report back as invalid
                    //     isOtherAnswerValid = false;
                    // } else {
                    //     answers.push(question.otherAnswer);
                    // }
                    if (question.otherAnswers.length < 1) {
                        // other answer is blank, report back as invalid
                        isOtherAnswerValid = false;
                    } else {
                        _.each(question.otherAnswers, function(otherAnswer, i) {
                            if (otherAnswer !== "") {
                                answers.push({
                                    text: otherAnswer,
                                    label: otherAnswer,
                                    checked: true,
                                    other: true
                                });
                            }
                        });
                    }
                }

                // enable/disable continue button
                return answers.length > 0 && isOtherAnswerValid;
            };

            /**
             * Filters out unselected items and submits an array of the selected options.
             * @param  {array} options An array of all options regardless of which options the
             * user selected.
             */
            $scope.answerMultiSelect = function(question) {
                var answers;

                // if (!$scope.isAnswerValid) {
                //     return;
                // }

                if (question.hoisted_options) {
                    question.options = question.options.concat(question.hoisted_options);
                }
                answers = _.filter(question.options, function(option) {
                    return option.checked;
                });

                // in case of multiselect containing groups
                if (question.groupedOptions && question.groupedOptions.length) {
                    answers = [];
                    _.each(question.groupedOptions, function(groupedOption) {
                        answers = answers.concat(_.filter(groupedOption.options, function(option) {
                            return option.checked;
                        }));
                    });
                }

                _.each(question.otherAnswers, function(otherAnswer, i) {
                    if (otherAnswer !== "") {
                        answers.push({
                            text: otherAnswer,
                            label: otherAnswer,
                            checked: true,
                            other: true
                        });
                    }
                });
                return answers;
            };


            $scope.$watch('question.otherAnswers', function(newValue) {

                if ($scope.question && $scope.question.required && !$scope.answer) {
                    if ($scope.question.allow_other && $scope.question.otherOption && $scope.question.otherOption.checked && $scope.question.otherAnswers && $scope.question.otherAnswers.length) {
                        //if ($scope.question.allow_other && $scope.question.otherAnswers && $scope.question.otherAnswers.length) {
                        $scope.isAnswerValid = true;
                    } else {
                        $scope.isAnswerValid = false;
                    }
                } else {
                    $scope.isAnswerValid = true;
                }
            });


            $scope.answerSingleSelect = function(question) {
                var groupedOptions, answer;
                if (question.groupedOptions && question.groupedOptions.length) {
                    groupedOptions = _.flatten(_.map(question.groupedOptions, function(option) {
                        return option.options;
                    }));
                    answer = _.find(groupedOptions, function(option) {
                        return option.checked;
                    });
                } else {
                    answer = _.find(question.options, function(option) {
                        return option.checked;
                    });
                }
                if (!answer && question.otherAnswers.length) {
                    answer = {
                        checked: true,
                        label: question.otherAnswers[0],
                        text: question.otherAnswers[0],
                        other: true,
                        code: question.code
                    };
                } else if (!question.required && question.type !== 'yes-no') {
                    // No answer given. Submit empty.
                    answer = {
                        text: 'NO_ANSWER'
                    };
                }
                return answer;
            };

            $scope.answerAutoSingleSelect = function(answer, otherAnswer) {
                if (answer === 'other') {
                    $scope.answerQuestion({
                        text: otherAnswer,
                        label: answer
                    });
                } else {
                    $scope.answerQuestion($scope.question.options[answer]);
                }
            };



            $scope.skipBack = function() {

                var lastPage = survey.getLastPage();
                if (lastPage) {
                    $location.path(['survey', $routeParams.surveySlug, lastPage.order, $routeParams.uuidSlug].join('/'));
                } else {
                    $location.path('/surveys');
                }

            };



            // gets called whenever new page is loaded...?
            $scope.loadSurvey = function(data) {
                $scope.survey = data.survey;
                $scope.survey.status = data.status;
                if (!$routeParams.action === 'edit' && data.status === 'complete' || data.status === 'terminate') {
                    $location.path(['survey', $scope.survey.slug, 'complete', $routeParams.uuidSlug].join('/'));
                }
                $scope.survey.questions = _.flatten(_.map($scope.survey.pages, function(page) {
                    return page.questions;
                }));

                // Get answers from user profile used to pre-populate profile questions.
                if (data.meta && data.meta.profile) {
                    $scope.answers = _.extend($scope.answers, data.meta.profile);
                }
                if (app.user && app.user.registration) {
                    $scope.answers = _.extend($scope.answers, app.user.registration);
                }

                _.each(data.responses, function(response) {
                    if (_.isObject(response.question)) {
                        try {
                            $scope.answers[response.question.slug] = JSON.parse(response.answer_raw);
                        } catch (e) {
                            $scope.answers[response.question.slug] = response.answer;
                        }
                    } else if (_.isString(response.question)) {
                        try {
                            $scope.answers[response.question] = JSON.parse(response.answer_raw);
                        } catch (e) {
                            $scope.answers[response.question] = response.answer;
                        }
                    }
                });

                if ($routeParams.pageID) {
                    $scope.page = _.findWhere($scope.survey.pages, {
                        order: parseInt($routeParams.pageID, 10)
                    });
                    if (!$scope.page) {
                        $scope.page = {
                            questions: []
                        };
                    }
                } else if (!$scope.question) {
                    $scope.question = _.findWhere($scope.survey.questions, {
                        slug: $routeParams.questionSlug
                    });
                }
                if ($routeParams.action === 'edit') {
                    $scope.page = _.filter($scope.survey.pages, function(page) {
                        if (_.contains(_.pluck(page.questions, 'slug'), $routeParams.questionSlug)) {
                            return true;
                        }
                    })[0];
                }
                $scope.surveyProgress = ($scope.survey.pages.indexOf($scope.page) / $scope.survey.pages.length) * 100;


                _.each($scope.page.questions, function(question) {
                    if (question.rows.length && !question.options) {
                        question.options = [];
                    }
                });

                if ($scope.question && $scope.question.title) {
                    $scope.question.displayTitle = $interpolate($scope.question.title)($scope);
                }

                if ($scope.question && $scope.question.type === 'info' && $scope.question.info) {
                    $scope.infoView = 'survey-pages/' + $routeParams.surveySlug + '/' + $scope.question.info + '.html';

                }

                /* Specific to single and multi select for now. */
                $scope.isAnswerValid = $scope.question && !$scope.question.required;

                // initialize survey service
                survey.initializeSurvey($scope.survey, $scope.page, $scope.answers);


                // Fill options list.
                if ($scope.question && $scope.question.options_json && $scope.question.options_json.length > 0 && !$scope.question.options_from_previous_answer) {
                    // Using the provided json file to set options.

                    $http.get($scope.question.options_json).success(function(data) {
                        var groups = _.groupBy(data, function(item) {
                            return item.group;
                        }),
                            previousAnswers = [];

                        if ($scope.question.update && $scope.activeMarker) {
                            previousAnswers = _.pluck($scope.activeMarker.answers, 'text');
                        } else if ($scope.answer) {
                            if (_.isArray($scope.answer)) {
                                previousAnswers = _.pluck($scope.answer, 'text');
                            } else {
                                previousAnswers = [$scope.answer.text];
                            }

                        }

                        if ($scope.question.randomize_groups) {
                            $scope.question.options = _.flatten(_.shuffle(_.toArray(groups)));
                        } else {
                            $scope.question.options = data;
                        }


                        // Set answers for editing a marker.
                        if ($scope.activeMarker && $scope.activeMarker.answers) {
                            _.each($scope.question.options, function(option, index, list) {
                                var result = _.find($scope.activeMarker.answers, function(answer) {
                                    return option.label === answer.label;
                                });
                                option.checked = !_.isUndefined(result);
                            });
                        }


                        // Hoist options.
                        if ($scope.question && $scope.question.hoist_answers) {
                            $scope.question.hoisted_options = [];

                            _.each(survey.getAnswer($scope.question.hoist_answers.slug), function(option) {
                                var newOption = {};

                                angular.extend(newOption, option);

                                if (_.contains(previousAnswers, option.text)) {
                                    newOption.checked = true;
                                } else {
                                    newOption.checked = false;
                                }



                                $scope.question.hoisted_options.unshift(newOption);
                                $scope.question.options = _.filter($scope.question.options, function(item) {
                                    return item.label !== option.label;
                                });
                            });
                        }

                        _.each($scope.question.options, function(option) {

                            if (_.contains(previousAnswers, option.text)) {
                                option.checked = true;
                            } else {
                                option.checked = false;
                            }

                            //distinguish group titles
                            if (_.startsWith(option.text, '*')) {
                                option.text = _.splice(option.text, 1);
                                option.isGroupName = true;
                            }


                        });

                        if ($scope.question.type === "multi-select") {
                            $scope.isAnswerValid = $scope.validateMultiSelect($scope.question);
                        }
                    });

                } else if ($scope.question && $scope.question.options_from_previous_answer && $scope.question.slug === 'county') {
                    // County question is dependent on state answer to retrieve a
                    // json file of counties for the selected state.

                    var stateAbrv = 'NO_STATE',
                        stateAnswer = survey.getAnswer($scope.question.options_from_previous_answer);
                    if (stateAnswer.label && stateAnswer.label.length > 2) {
                        // submitted via other text box
                        stateAbrv = stateAnswer.label.toLowerCase().replace(/\s+/g, '');
                    } else if (stateAnswer.label) {
                        stateAbrv = stateAnswer.label;
                    }

                    $http.get('surveys/counties/' + stateAbrv + '.json').success(function(data, status, headers, config) {
                        $scope.question.options = data;
                        if (!$scope.answer) {
                            return;
                        }

                        if (_.isArray($scope.answer)) {
                            $scope.answer = _.first($scope.answer);
                        }
                        _.each($scope.question.options, function(option, index) {
                            if (option.name === $scope.answer.name) {
                                option.checked = true;
                                $scope.isAnswerValid = true;
                            }
                        });
                    }).error(function(data, status, headers, config) {
                        $scope.gotoNextQuestion();
                    });
                }



                if ($scope.question && $scope.question.options_from_previous_answer) {
                    $scope.question.options = survey.getAnswer($scope.question.options_from_previous_answer);

                    _.each($scope.question.options, function(item) {
                        item.checked = false;
                    });

                    if ($scope.answer) {
                        var answerArr = _.isArray($scope.answer) ? $scope.answer : [$scope.answer];
                        _.each($scope.question.options, function(item) {
                            _.each(answerArr, function(answer) {
                                if ((item.text || item.name) === (answer.text || answer.name)) {
                                    item.checked = true;
                                    $scope.isAnswerValid = true;
                                }
                            });
                        });
                    }
                }
                //commenting out on 10-21-2013
                //$scope.nextPagePath = $scope.getNextPagePath();
                $scope.loading = false;

                $scope.validity = {};

                $scope.$watch('validity', function(newValidity) {
                    // if (newPage) {
                    //     $scope.validatePage(newPage);
                    // }
                    if (newValidity) {
                        $scope.pageIsValid = _.every(_.values($scope.validity));
                    }

                }, true);
            };
            $scope.viewPath = app.viewPath;
            if ($routeParams.uuidSlug && !_.string.startsWith($routeParams.uuidSlug, 'offline') && app.offline) {
                $http.get(app.server + '/api/v1/survey/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
                    app.data = {
                        survey: data
                    };
                    $scope.loadSurvey({
                        survey: data
                    });
                });
            } else if ($routeParams && app.data && $routeParams.uuidSlug === app.data.uuid) {
                // online surveys that have already been started
                $scope.loadSurvey({
                    survey: app.data.survey,
                    responses: app.data.responses
                });
            } else if ($routeParams && _.string.startsWith($routeParams.uuidSlug, 'offline') && app.offline) {
                var ts = new Date();
                // this is an offline survey
                if ($routeParams.uuidSlug === 'offline') {
                    // this is a new offline survey
                    $scope.answers = {};
                    if (!app.respondents) {
                        app.respondents = {};
                    }
                    $routeParams.uuidSlug = 'offline_' + ts.getTime();
                    app.respondents[$routeParams.uuidSlug] = {
                        uuid: $routeParams.uuidSlug,
                        survey: $routeParams.surveySlug,
                        ts: ts,
                        responses: []
                    }
                    storage.saveState(app);
                    $location.path(['survey', $routeParams.surveySlug, 1, $routeParams.uuidSlug].join('/'));
                } else {
                    // this is an old offline survey
                    $scope.loadSurvey({
                        survey: angular.copy(_.findWhere(app.surveys, {
                            slug: $routeParams.surveySlug
                        })),
                        responses: app.respondents[$routeParams.uuidSlug].responses
                    });
                }
            } else {
                $http.get(app.server + '/api/v1/respondant/' + $routeParams.uuidSlug + '/?format=json').success(function(data) {
                    app.data = data;
                    $scope.loadSurvey(data);
                }).error(function(data, status, headers, config) {
                    $scope.survey.status = 'invalid';
                });
            }


        });
})();