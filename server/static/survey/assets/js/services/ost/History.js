//'use strict';

angular.module('askApp')
  .factory('history', function ($http, $location, survey) {

    var getSurveyTitle = function(respondent) {
        var title = respondent.survey;
        title += respondent.ts;
        return title;
    }

    var getOrganizationName = function(respondent) {
        var val = "None";
        try {
            val = _.findWhere(respondent.responses, {question: 'org-name'}).answer.text;
        } catch(e) { }
        return val;
    };

    var getAnswer = function(questionSlug, respondent) {
        try {
            var question = _.findWhere(respondent.responses, {question: questionSlug}), 
                answer = '',
                tmp,
                // We don't have access to the question types here 
                // so we're sorting them out here.
                singleSelects = 
                            ['org-type',
                             'proj-num-people', 
                             'proj-data-years', 
                             'proj-data-frequency', 
                             'proj-financial-support-timeline',
                             'ef-rockyintertidal-point-vs-grid',
                             'ef-kelp-and-shallow-rock-point-vs-grid',
                             'ef-middepthrock-point-vs-grid',
                             'ef-estuarine-point-vs-grid',
                             'ef-softbottomintertidal-point-vs-grid',
                             'ef-softbottomsubtidal-point-vs-grid',
                             'ef-deep-point-vs-grid',
                             'ef-nearshore-point-vs-grid',
                             'ef-consumptive-point-vs-grid',
                             'ef-nonconsumptive-point-vs-grid',
                             'cd-collection-locations',
                             'proj-data-availability', 
                             'future-monitoring-yes-no'],
                
                multiSelects = 
                             ['proj-operational-capacity-if-funded', 
                              'ecosystem-features', 
                              'future-monitoring-ecosystems'],
                
                groupedMultiSelects = 
                             ['org-funding',
                              'ef-rockyintertidal-species',
                              'ef-kelp-and-shallow-rock-species',
                              'ef-middepthrock-species',
                              'ef-estuarine-species',
                              'ef-softbottomintertidal-species',
                              'ef-softbottomsubtidal-species',
                              'ef-deep-species',
                              'ef-nearshore-species',
                              'ef-consumptive-species',
                              'ef-nonconsumptive-species'],

                mapPolys =  ['ef-rockyinteridal-collection-areas',
                             'ef-kelp-and-shallow-rock-collection-areas',
                             'ef-middepthrock-collection-areas',
                             'ef-estuarine-collection-areas',
                             'ef-softbottomintertidal-collection-areas',
                             'ef-softbottomsubtidal-collection-areas',
                             'ef-deep-collection-areas',
                             'ef-nearshore-collection-areas',
                             'ef-consumptive-collection-areas',
                             'ef-nonconsumptive-collection-areas'],
                
                mapPoints = ['ef-rockyintertidal-collection-points',
                             'ef-kelp-and-shallow-rock-collection-points',
                             'ef-middepthrock-collection-points',
                             'ef-estuarine-collection-points',
                             'ef-softbottomintertidal-collection-points',
                             'ef-softbottomsubtidal-collection-points',
                             'ef-deep-collection-points',
                             'ef-nearshore-collection-points',
                             'ef-consumptive-collection-points',
                             'ef-nonconsumptive-collection-points'];

            // Grab answer based on the type of question.
            if (_.contains(singleSelects, questionSlug)) {
                answer = question.answer.text;

            } else if (_.contains(multiSelects, questionSlug)) {
                var objs = question.answer;
                _.each(objs, function(obj, index) {
                    answer += answer.length > 0 ? ", " + obj.text : obj.text;
                });

            } else if (_.contains(groupedMultiSelects, questionSlug)) {
                answer = question.answer;
                _.each(answer, function(obj, index) {
                    if (index === 0 && obj.groupName) {
                        obj.showGroupName = true;
                    } else if (obj.groupName && obj.groupName !== answer[index-1].groupName) {
                        obj.showGroupName = true;
                    } else if (obj.other && answer[index-1].showGroupName !== 'Other') {
                        obj.showGroupName = true;
                        obj.groupName = 'Other';
                    } else {
                        obj.showGroupName = false;
                    }
                });

            } else {
                answer = question.answer;
            }
            
        } catch(e) {
            answer = '';
        }

        // Sometimes its and array
        
        
        if (Array.isArray(answer)){
            var answers = _.each(answer, function(ans){
                return ans.text;
            });
            answer = answers.join(", ");
        }

        // Sometimes its and ojbect
        if (answer.text) {
            answer = answer.text;
        }

        if (answer === 'NA' || answer === 'NO_ANSWER') {
            answer = '';
        }
        
        return answer;
    };

    



    // Public API here
    return {
      'getOrganizationName': getOrganizationName,
      'getAnswer': getAnswer
    };
  });
