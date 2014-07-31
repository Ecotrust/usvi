//'use strict';

angular.module('askApp')
  .factory('survey', function ($http, $location) {
    // Service logic
    // ...

    var survey,
        page,
        answers;

    var initializeSurvey = function(thisSurvey, thisPage, thisAnswers) {
        survey = thisSurvey;
        page = thisPage;
        answers = thisAnswers;
    };

    var isOnFirstPage = function() {
        if (page) { 
            return (page.order || 2) === 2;
        }
        return false;
    };

    var getPageFromQuestion = function(questionSlug) {
        return _.find(survey.pages, function (page) {
            return _.findWhere(page.questions, {slug: questionSlug});
        });
    };

    var cleanSurvey = function(respondent) {
        var goodResponses = [];
        _.each(respondent.responses, function(response, i) {
            var page = getPageFromQuestion(response.question);
            if ( !skipPageIf(page)) {
                goodResponses.push(response);
            } 
        });
        
        if (goodResponses.length) {
            return goodResponses;
        }

        return respondent.responses;
    };

    var getQuestionUriFromSlug = function(slug) {
        var page = getPageFromQuestion(slug);
        return _.findWhere(page.questions, {slug: slug}).resource_uri;
    };

    
    // var getNextPagePath = function(numQsToSkips) {
    //     console.log('getNextPagePath');
    //     var start = new Date().getTime();
    //     var returnValue = ['survey', $scope.survey.slug, $scope.getNextPage().order, $routeParams.uuidSlug].join('/');
    //     console.log(new Date().getTime() - start);
    //     return returnValue;
    //     // return ['survey', $scope.survey.slug, $scope.getNextPage().order, $routeParams.uuidSlug].join('/');
    // };

    var getNextPageWithSkip = function(numPsToSkips) {
        /*
        Params
        - numPsToSkips : [Integer] Indicates the number of pages to ignore after the current
                          page before looking for the next page.
        
        Returns a page object or false. This function is cllaed by getNextPage which will
        this function until a page it returned or it runs out of pages.
        */

        var index = _.indexOf(survey.pages, page) + 1 + (numPsToSkips || 0);
        var nextPage = survey.pages[index];
        
        if (nextPage) {
            // Check to see if this page should be skipped 
            if (skipPageIf(nextPage)) {
                nextPage = false;
            }
        } 
        
        return nextPage ? nextPage : false;
    };
    
    var getNextPage = function(numPages) {
        var foundPage = false, index = 0;
        while (foundPage === false && index < numPages) {
            foundPage = getNextPageWithSkip(index);
            index++;
        }
        return foundPage;
    };

    // NOTE:  In order for this function to work, controller must first call initializeSurvey to initialize survey, page, and answers
    //        perhaps a better strategy would be to pass in those values...?
    var getLastPage = function(numPsToSkips) {
        var foundPage = false, index = numPsToSkips || 0;
        while (foundPage === false && index < survey.pages.length) {
            foundPage = getLastPageWithSkip(index);
            index++;
        }
        return foundPage;
    };

    var getLastPageWithSkip = function(numPsToSkips) {
        var index = _.indexOf(survey.pages, page) - 1 - (numPsToSkips || 0);
        var nextPage = survey.pages[index];
        
        if (nextPage) {
            if (skipPageIf(nextPage)) {
                // _.each(nextPage.questions, function (question) {
                //     console.log('called deleteAnswer from getLastPageWithSkip');
                //     $scope.deleteAnswer(question, $routeParams.uuidSlug);
                // });
                
                nextPage = false;
            }
        } 

        return nextPage ? nextPage : false;
    };

    var keepQuestion = function(op, answer, testCriteria) {
        /*
        Returns a [Boolean]. If the anser passes the test based on op against testCriteria it
        returns false, meaning doe not keep it. 
        */
        if (op === '<') {
            return !isNaN(answer) && answer >= testCriteria;
        } else if (op === '>') {
            return !isNaN(answer) && answer <= testCriteria;
        } else if (op === '=') {
            if ( !isNaN(answer) ) { // if it is a number
                return answer !== testCriteria;
            } else if (_.str.include(testCriteria, '|')) { // if condition is a list
                // keep if intersection of condition list and answer list is empty
                return _.intersection( testCriteria.split('|'), answer ).length === 0;
            } else { // otherwise, condition is a string, keep if condition string is NOT contained in the answer
                var trimmedAnswer = _.map(answer, function(item) { return item.trim(); }),
                    trimmedCriteria = testCriteria.trim();
                return ! _.contains(trimmedAnswer, testCriteria);
                // return ! _.contains(answer, testCriteria);
            }
        } else if (op === '!') {  
            if ( !isNaN(answer) ) { // if it is a number
                // keep the question if equal (not not equal)
                return answer === testCriteria;
            } else if (_.str.include(testCriteria, '|')) { // if condition is a list
                // keep if intersection of condition list and answer list is populated
                return _.intersection( testCriteria.split('|'), answer ).length > 0 ;
            } else { // otherwise, condition is a string, keep if condition string is contained in the answer
                var trimmedAnswer = _.map(answer, function(item) { return item.trim(); }),
                    trimmedCriteria = testCriteria.trim();
                return _.contains(trimmedAnswer, trimmedCriteria);
                // return _.contains(answer, testCriteria);
            }
        }
        return undefined;
    };

    // Potential Problem - getAnswer is called from loadSurvey before answer array is initialized...
    // potential solution - moved initialization call to earlier point in loadSurvey...
    var getAnswer = function(questionSlug) {
        var slug, gridSlug;
        if (_.string.include(questionSlug, ":")) {
            slug = questionSlug.split(':')[0];
            gridSlug = questionSlug.split(':')[1].replace(/-/g, '');
        } else {
            slug = questionSlug;
        }
        
        if (answers[slug]) {
            if (gridSlug) {
                return _.flatten(_.map(answers[slug], function (answer) {
                    return _.map(answer[gridSlug], function (gridAnswer){
                        return {
                            text: answer.text + ": " + gridAnswer,
                            label: _.string.slugify(answer.text + ": " + gridAnswer)
                        }
                    });
                }));
            } else {
                return answers[slug];
            }
        } else {
            return false;
        }
    };

    var skipPageIf = function(nextPage) {
        /*
        
        Returns a boolean, the negative of keep. So if keep = true, this function returns false 
        and the page will not be skipped.

        */
        if (nextPage.id === 190){
            var answer = getAnswer('ecosystem-features');
            if (answer.length === 1 && answer[0].label === 'contextual-data-only-no-ecological-monitoring'){
                return true;
            }

        }
        var keep = true;

        //console.log(nextPage);
        if ( nextPage.blocks && nextPage.blocks.length ) {
            var blocks = nextPage.blocks;
            if ( _.contains( _.pluck(blocks, 'name'), 'Placeholder') ) {
                return true;
            }
        } else if ( nextPage.skip_question && nextPage.skip_condition ) {
            var blocks = [nextPage];
        } else {
            var blocks = []; //(return false)
        }
    
        _.each(blocks, function(block) {
            if (block.skip_question === null) {
                // Block has no skip questions.
                keep = true;
            
            } else {
                // Block has a skip question. Find out if it calls for being skipped.
                var questionSlug = _.findWhere(survey.questions, {resource_uri: block.skip_question}).slug,
                    answer = getAnswer(questionSlug),
                    condition = block.skip_condition,
                    op = condition[0],
                    testCriteria = condition.slice(1);

                if (_.isObject(answer)) {
                    if (_.isNumber(answer.answer)) {
                        answer = answer.answer;
                    } else if (_.isArray(answer)) {
                        answer = _.pluck(answer, "text");
                    } else if (_.isArray(answer.answer)) {
                        answer = _.pluck(answer.answer, "text");
                    } else {
                        answer = [answer.answer ? answer.answer.text : answer.text];    
                    }
                }
                
                keep = keep && keepQuestion(op, answer, testCriteria);
            }

        });
        
        return !keep;
    };

    $http.defaults.headers.post['Content-Type'] = 'application/json';

    var sendRespondent = function (respondent) {
        var url = app.server + '/api/v1/offlinerespondant/';
        var responses = angular.copy(respondent.responses);
        
        _.each(responses, function (response) {
            // var question_uri = response.question.resource_uri;
            var question_uri = getQuestionUriFromSlug(response.question);
            response.question = question_uri;
            response.answer_raw = JSON.stringify(response.answer);
        });
        var newRespondent = {
            ts: respondent.ts,
            uuid: respondent.uuid.replace(':', '_'),
            responses: responses,
            status: respondent.status,
            complete: respondent.complete,
            survey: '/api/v1/survey/' + respondent.survey + '/'
        };
        return $http.post(url, newRespondent);
        
    };       

    var submitSurvey = function (respondent, survey) {
        //verify report (delete any necessary questions) 
        // call function within survey service...
        var answers = _.indexBy(respondent.responses, function(item) {
            return item.question;
        });
        //clean survey of any unncecessary question/answers 
        initializeSurvey(survey, null, answers);
        respondent.responses = cleanSurvey(respondent);
        return sendRespondent(respondent);
    }


    var resume = function(respondent) {
        var url, 
            page = {order: 1};
        
        if (respondent.responses.length && respondent.last_question) {
            page = getPageFromQuestion(respondent.last_question);
        }

        url = [
            '/survey',
            respondent.survey_slug,
            page.order,
            respondent.uuid
        ].join('/');
        
       $location.path(url);
    };

    var generalizeEcosystemSlug = function(slug) {
        var pointsKey = 'points',
            areasKey = 'areas',
            s;
        s = slug.indexOf(pointsKey) > -1 ? pointsKey : areasKey;
        s = slug.slice(0, -s.length);
        return s;
    };

    var ecosystemLabelToSlug = function(label) {
        var dict = {};
        dict['Rocky Intertidal Ecosystems'] = 'ef-rockyintertidal-collection-';
        dict['Kelp and Shallow (0-30m) Rock Ecosystems'] = 'ef-kelp-and-shallow-rock-collection-';
        dict['Mid depth (30-100m) Rock Ecosystems'] = 'ef-middepthrock-collection-';
        dict['Estuarine and Wetland Ecosystems'] = 'ef-estuarine-collection-';
        dict['Soft-bottom Intertidal and Beach Ecosystems'] = 'ef-softbottomintertidal-collection-';
        dict['Soft bottom Subtidal (0-100m) Ecosystems'] = 'ef-softbottomsubtidal-collection-';
        dict['Deep Ecosystems and Canyons (>100m)'] = 'ef-deep-collection-';
        dict['Nearshore Pelagic Ecosystems'] = 'ef-nearshore-collection-';
        dict['Consumptive Uses'] = 'ef-consumptive-collection-';
        dict['Non-consumptive Uses'] = 'ef-nonconsumptive-collection-';
       


        return dict[label];
    }

    var ecosystemSlugToLabel = function (slug) {
        var key = generalizeEcosystemSlug(slug),
            dict = {};
        dict['ef-rockyintertidal-collection-'] = 'Rocky Intertidal Ecosystems';
        dict['ef-kelp-and-shallow-rock-collection-'] = 'Kelp and Shallow (0-30m) Rock Ecosystems';
        dict['ef-middepthrock-collection-'] = 'Mid depth (30-100m) Rock Ecosystems';
        dict['ef-estuarine-collection-'] = 'Estuarine and Wetland Ecosystems';
        dict['ef-softbottomintertidal-collection-'] = 'Soft-bottom Intertidal and Beach Ecosystems';
        dict['ef-softbottomsubtidal-collection-'] = 'Soft bottom Subtidal (0-100m) Ecosystems';
        dict['ef-deep-collection-'] = 'Deep Ecosystems and Canyons (>100m)';
        dict['ef-nearshore-collection-'] = 'Nearshore Pelagic Ecosystems';
        dict['ef-consumptive-collection-'] = 'Consumptive Uses';
        dict['ef-nonconsumptive-collection-'] = 'Non-consumptive Uses';

        return dict[key];
    }


    var ecosystemSlugToColor = function(slug){
        var key = generalizeEcosystemSlug(slug),
            dict = {};
            dict['ef-rockyintertidal-collection-'] = '#E85E47';
            dict['ef-kelp-and-shallow-rock-collection-'] = '#3EE8D4';
            dict['ef-middepthrock-collection-'] = '#68C6FF';
            dict['ef-estuarine-collection-'] = '#28E85B';
            dict['ef-softbottomintertidal-collection-'] = '#ff973f';
            dict['ef-softbottomsubtidal-collection-'] = '#e8cd2b';
            dict['ef-deep-collection-'] = '#4480FF';
            dict['ef-nearshore-collection-'] = '#6347E8';
            dict['ef-consumptive-collection-'] = '#317139';
            dict['ef-nonconsumptive-collection-'] = '#FE5BFF';

            return dict[key];
    };
    


    // Public API here
    return {
      'isOnFirstPage': isOnFirstPage,
      'getNextPage': getNextPage,
      'getLastPage': getLastPage,
      'initializeSurvey': initializeSurvey,
      'getAnswer': getAnswer,
      'cleanSurvey': cleanSurvey,
      'getQuestionUriFromSlug': getQuestionUriFromSlug,
      'submitSurvey': submitSurvey,
      'resume': resume,
      'ecosystemSlugToColor':ecosystemSlugToColor,
      'ecosystemLabelToSlug':ecosystemLabelToSlug,
      'ecosystemSlugToLabel':ecosystemSlugToLabel
    };
  });
