//'use strict';

angular.module('askApp')
  .factory('history', function ($http, $location) {

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
        var answer = '';
        try {

            if (0 <= ['org-type', 'org-mpa-funded', 'proj-has-sufficient-funds', 'proj-data-availability'].indexOf(questionSlug)) {
                // For single-select, yes-no
                answer = _.findWhere(respondent.responses, {question: questionSlug}).answer.text;

            } else if (0 <= ['org-funding', 'ecosystem-features'].indexOf(questionSlug)) {
                // For multi-select
                var objs = _.findWhere(respondent.responses, {question: questionSlug}).answer;
                _.each(objs, function(obj, index) {
                    answer += answer.length > 0 ? ", " + obj.text : obj.text;
                });

            } else if (0 <= ['org-funding'].indexOf(questionSlug)) {
                // Grouped multi-select.
                var island = _.findWhere(respondent.responses, {question: 'island'}).answer.label,
                    islandSlug = (island === 'st-thomas' || island === 'st-john') ? 'st-thomas-st-john' : island;

                answer = _.findWhere(respondent.responses, {question: questionSlug + '-' + islandSlug}).answer;

                // TODO: currently no way of determining definitively whether answers are from a grouped multi-select or an ungrouped multi-select
                // (no groupName may present because either just Others were selected, or no groups were present)
                // seems like solution would be to ensure selections that were grouped under Other heading should be marked as such...                    
                _.each(answer, function(obj, index) {
                    if (index === 0 && obj.groupName) {
                        obj.showGroupName = obj.groupName;
                    } else if (obj.groupName && obj.groupName !== answer[index-1].groupName) {
                        obj.showGroupName = obj.groupName;
                    } else if (obj.other && answer[index-1].showGroupName !== 'Other') {
                        obj.showGroupName = 'Other';
                    } else {
                        obj.showGroupName = undefined;
                    }
                });

            } else {
                answer = _.findWhere(respondent.responses, {question: questionSlug}).answer;

            }
            
        } catch(e) {
            answer = '';
        }
        if (answer === 'NA') {
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
