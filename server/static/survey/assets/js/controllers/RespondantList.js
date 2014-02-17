//'use strict';

angular.module('askApp')
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.headers.patch = {
            'Content-Type': 'application/json;charset=utf-8'
            // 'X-CSRFToken': getCookie('csrftoken')
        }
        // $httpProvider.defaults.headers['delete'] = {
        //     'X-CSRFToken': getCookie('csrftoken')
        // }
    }])
    .controller('RespondantListCtrl', function($scope, $http, $routeParams, $location, history) {
    var areaMapping = {
        stcroix: "St. Croix",
        stthomas: "St. Thomas",
        puertorico: "Puerto Rico",
        region: "Region"
    };

    var dateFromISO = function (iso_str) {
        // IE8 and lower can't parse ISO strings into dates. See this
        // Stack Overflow question: http://stackoverflow.com/a/17593482
        if ($("html").is(".lt-ie9")) {
            var s = iso_str.split(/\D/);
            return new Date(Date.UTC(s[0], --s[1]||'', s[2]||'', s[3]||'', s[4]||'', s[5]||'', s[6]||''));
        }
        return new Date(iso_str);
    };
    $scope.busy = true;
    $scope.viewPath = app.server + '/static/survey/';
    $scope.activePage = 'survey-stats';

    // if (! _.isEmpty($location.search())) {
    //     $scope.filter.area = $location.search().area;
    // }

    $scope.$watch('filter.area', function (newFilter) {
        console.log('watch');
        // $location.search($scope.filter);
        if (newFilter) {
            $scope.area = areaMapping[newFilter];    
        }
    }, true);

    $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        $scope.survey = data;
        var start_date = $location.search().ts__gte ?
            new Date(parseInt($location.search().ts__gte, 10)) :
            dateFromISO($scope.survey.response_date_start);
        var end_date = $location.search().ts__lte ?
            new Date(parseInt($location.search().ts__lte, 10)) :
            dateFromISO($scope.survey.response_date_end);
        $scope.filter = {
            min: dateFromISO($scope.survey.response_date_start).valueOf(),
            max: dateFromISO($scope.survey.response_date_end).valueOf(),
            startDate: start_date.valueOf(),
            endDate: end_date.valueOf()
        }
        _.each($scope.survey.questions, function (question) {
            // save a reference to filter questions which are specified by uri
            question.filters = {};
            if (question.visualize && question.filter_questions) {
                question.filterQuestions = [];
                _.each(question.filter_questions, function (filterQuestion) {
                    question.filterQuestions.push($scope.getQuestionByUri(filterQuestion));
                });

            }
        });
        

    }).success(function() {
        $http.get('/api/v1/dashrespondant/?format=json&survey__slug__exact=' + $routeParams.surveySlug).success(function(data) {
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
            $scope.responsesShown = $scope.respondents.length;
            $scope.busy = false;
        });
         
    });

    $scope.getQuestionByUri = function (uri) {
        return _.findWhere($scope.survey.questions, {'resource_uri': uri});
    };

    $scope.getQuestionBySlug = function (slug) {
		return _.findWhere($scope.survey.questions, {'slug': slug});
    };

    $scope.showNext20 = function(surveyFilter) {
        $scope.gettingNext20 = true;
        $http.get($scope.meta.next)
            .success(function (data, callback) {
                _.each(data.objects, function(respondent, index) {
                    $scope.respondents.push(respondent);
                });
                $scope.gettingNext20 = false;
                $scope.meta = data.meta;
                // console.log($scope.respondentList);
            }).error(function (data) {
                console.log(data);
            }); 
    };
    $scope.saveRespondent = function (respondent, data) {
        return $http({
            url: respondent.resource_uri,
            data: data,
            method: "PATCH"
        })
            .success(function (data) {
            })
            .error(function (err) {
                alert(err.message);
            });
    };
    $scope.saveComment = function (respondent, comment, notify) {
        $scope.saveRespondent(respondent,
            { 
                comment: comment,
                notify: notify
             });
    };
    $scope.setStatus = function (respondent, status) {
        var newStatus;

        if (respondent.review_status === status) {
            newStatus = 'needs review';
        } else {
            newStatus = status;
        }
        $scope.saveRespondent(respondent, { review_status: newStatus })
            .success(function (data) {
                respondent.review_status = newStatus;
            });
        
    };
    $scope.getRespondent = function (respondent) {
        var url = app.server 
              + '/api/v1/reportrespondantdetails/'
              + respondent.uuid 
              + '/?format=json';        

        return $http.get(url)
            .success(function (data) {
                $scope.respondent = data;
                $scope.respondent.areas_fished = [];
                if (typeof($scope.respondent.responses.question) !== 'string') {
                    _.each($scope.respondent.responses, function(response, index) {
                        var questionSlug = response.question.slug;
                        try {
                            answer_raw = JSON.parse(response.answer_raw);
                        } catch(e) {
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
                $scope.respondent.survey = $scope.respondent.survey_slug;
                $scope.activeRespondent = $scope.respondent;
            }).error(function (err) {
                console.log(JSON.stringify(err));
            }); 
    };

    $scope.openRespondent = function (respondent) {
        if (respondent.open) {
            respondent.open = false;
        } else {
            $scope.closeRespondents();
            respondent.spin = true;
            // $scope.respondent = respondent;
            $scope.getRespondent(respondent).then(function () {
                respondent.open = true;
                respondent.spin = false;
            });
            
        }
        // respondent.open = !respondent.open;
    };

    $scope.closeRespondents = function () {
        _.each($scope.respondents, function(respondent, index) {
            respondent.open = false;
        });
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



    var getSurveyTitle = function(respondent) {
        var title = respondent.survey;
        title += respondent.ts;
        return title;
    }

});
