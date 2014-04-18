//'use strict';

angular.module('askApp')
    .controller('RespondantListCtrl', function($scope, $http, $routeParams, $location, $timeout, history, $rootScope, respondents, history) {
        var areaMapping = {
            stcroix: "St. Croix",
            stthomasstjohn: "St. Thomas & St. John",
            puertorico: "Puerto Rico",
            region: "Region"
        };


        $scope.user = app.user;

        $scope.viewPath = app.server + '/static/survey/';
        $scope.activePage = 'survey-stats';
        $scope.total_surveys = app.survey_meta.total;
        $scope.survey_meta = app.survey_meta;
        var loadReports = function(data, url) {
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
            console.log(data.meta);
            $scope.responsesShown = $scope.respondents.length;
            $scope.busy = false;
            $scope.filterChanged = {};
        };

        $scope.getReports = function(metaUrl, button) {
            console.log(metaUrl);
            var url;

            if (metaUrl) {
                url = metaUrl;
            } else {
                if ($scope.clearingFilters) {
                    return false;
                }
                if (button) {
                    // clicking button, but url is null
                    return false;
                }
            }
            $scope.busy = true;
            respondents.getReports(url, $scope.filter).success(function (data) {
                loadReports(data, url)
            });
        };

        $scope.goToPage = function (page) {
            $scope.getReports($scope.meta.base_url + '&page=' + page, true);
        };

        $scope.search = function (searchTerm) {
            if (searchTerm) {
                $scope.getReports('/api/v1/dashrespondant/search/?format=json&limit=5&q=' + searchTerm);
            } else {
                $scope.getReports();
            }
            // $scope.searchTerm = $location.search().q;
        };


        $scope.filterChanged = {};

        $scope.clearFilters = function () {
            console.log('clear');
            $scope.clearingFilters = true;
            $scope.filter.startDate = $scope.filter.min;
            $scope.filter.endDate = $scope.filter.max;
            $scope.filter.review_status = "";
            $location.search({q: ""});
            $scope.filter.area = 'uscaribeez';
            $scope.clearingFilters = false;
            $scope.getReports();

        };

        $scope.updateSurveyDetails = function () {
            $rootScope.$broadcast('update-survey-stats');
        };

       var start_date = $location.search().ts__gte ?
            new Date(parseInt($location.search().ts__gte, 10)) :
            respondents.dateFromISO(app.survey_meta.reports_start);
        var end_date = $location.search().ts__lte ?
            new Date(parseInt($location.search().ts__lte, 10)) :
            respondents.dateFromISO(app.survey_meta.reports_end);
        $scope.filter = {
            min: respondents.dateFromISO(app.survey_meta.reports_start).valueOf(),
            max: respondents.dateFromISO(app.survey_meta.reports_end).valueOf(),
            startDate: start_date.valueOf(),
            endDate: end_date.valueOf(),
            area: "uscaribeez",
            review_status: "",
            entered_by: "",
            search: $location.search().q
        };

        $scope.$watch(function () {
            return $location.search().q;
        }, function (newSearch) {
            $scope.filter.search = newSearch;
        });

        $scope.$watchCollection('filter', function (newFilter) {
            if (newFilter.area) {
                $scope.area = areaMapping[newFilter.area];
            } else {
                $scope.area = areaMapping['region'];
            }
            $scope.getReports();
        })

        $scope.getQuestionByUri = function(uri) {
            return _.findWhere($scope.survey.questions, {
                'resource_uri': uri
            });
        };

        $scope.getQuestionBySlug = function(slug) {
            return _.findWhere($scope.survey.questions, {
                'slug': slug
            });
        };

        $scope.saveRespondent = function(respondent, data) {
            respondent.spin = true;

            return $http({
                url: respondent.resource_uri,
                data: data,
                method: "PATCH"
            })
                .success(function(data) {
                    respondent.spin = false;
                    //delete respondent.updated_at;
                })
                .error(function(err) {
                    // TraceKit.report({message: err});
                    console.log('error');
                });
        };
        $scope.saveComment = function(respondent, comment, notify) {

            $scope.saveRespondent(respondent, {
                comment: comment,
                notify: notify,
                updated_at: new Date()
            }).success(function (data) {
                respondent.updated_at = new Date();
                // $timeout(function () {
                //     delete respondent.updated_at;
                // }, 3000);
            });
        };
        $scope.setStatus = function(respondent, status) {
            var newStatus;

            if (respondent.review_status === status) {
                newStatus = 'needs review';
            } else {
                newStatus = status;
            }
            $scope.saveRespondent(respondent, {
                review_status: newStatus
            })
                .success(function(data) {
                    respondent.review_status = newStatus;
                    $scope.updateSurveyDetails();
                });

        };
        $scope.getRespondent = function(respondent) {
            var url = app.server + '/api/v1/reportrespondantdetails/' + respondent.uuid + '/?format=json';

            return $http.get(url)
                .success(function(data) {
                    $scope.respondent = data;
                    $scope.respondent.areas_fished = [];
                    if (typeof($scope.respondent.responses.question) !== 'string') {
                        _.each($scope.respondent.responses, function(response, index) {
                            var questionSlug = response.question.slug;
                            try {
                                answer_raw = JSON.parse(response.answer_raw);
                            } catch (e) {
                                console.log('failed to parse answer_raw');
                                answer_raw = response.answer;
                            }
                            if (response.question.type === 'map-multipolygon') {
                                $scope.respondent.areas_fished = $scope.respondent.areas_fished.concat(answer_raw);
                            }
                            if (response.question.slug === 'island') {
                                $scope.respondent.island = response.answer;
                            }

                            response.question = questionSlug;
                            response.answer = answer_raw;
                        });
                    }
                    if ($scope.respondent.survey.match(/puerto-rico/)) {
                        $scope.groups = _.groupBy($scope.getAnswer('fish-species-puerto-rico'), 'groupName');
                        $scope.fw = _.indexBy($scope.getAnswer('fish-weight-price-puerto-rico'), 'text');
                        $scope.arte = _.indexBy($scope.getAnswer('gear-type-puerto-rico'), 'text');
                        $scope.hours = _.indexBy($scope.getAnswer('hours-fished-puerto-rico'), 'text');
                        $scope.gear_size = _.indexBy($scope.getAnswer('gear-size-puerto-rico'), 'text');
                        _.each($scope.fw, function (fw) {
                            fw.peso = fw.libras * fw.precioporlibra;
                        });
                    }
                    $scope.respondent.survey = $scope.respondent.survey_slug;
                    $scope.activeRespondent = $scope.respondent;
                }).error(function(err) {
                    console.log(JSON.stringify(err));
                });
        };




        $scope.openRespondent = function(respondent) {
            if (respondent.open) {
                respondent.open = false;
            } else {
                $scope.closeRespondents();
                respondent.spin = true;
                // $scope.respondent = respondent;
                $scope.getRespondent(respondent).then(function() {
                    respondent.open = true;
                    respondent.spin = false;
                    respondent.updated_at = false;
                });
            }
            // respondent.open = !respondent.open;
        };

        $scope.closeRespondents = function() {
            _.each($scope.respondents, function(respondent, index) {
                respondent.open = false;
            });
        };


        $scope.getTitle = function(respondent) {
            return history.getTitle(respondent);
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



        var getSurveyTitle = function(respondent) {
            var title = respondent.survey;
            title += respondent.ts;
            return title;
        }

    });