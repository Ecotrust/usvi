angular.module('askApp').directive('multiquestion', function() {

    function _isBlank (q /* question */) {
        if (q.type === 'single-select' || q.type === 'multi-select' || q.type === 'yes-no') {
            var others = q.otherAnswers || {},
                hasOthers = others.length && ( ! (others.length === 1 && 
                                                  others[0] === "") ),
                options = q.groupedOptions && q.groupedOptions.length ? 
                            _.flatten(_.map(q.groupedOptions, function(option) {
                                return option.options;
                            })) :
                            q.options,
                someChecked = _.some(_.pluck(options, 'checked'));

            return !hasOthers && !someChecked;
        }
        
        if (q.type === 'map-multipoint') {
            return ! _.isArray(q.markers) || q.markers.length < 1;
        }

        if (q.type === 'map-multipolygon') {
            return ! _.isArray(q.answer) || q.answer.length < 1;
        }

        if (_.isArray(q.answer)) {
            return q.answer.length === 0 || 
                        (q.answer.length === 1 && 
                         q.answer[0].text && 
                         q.answer[0].text === 'NO_ANSWER');
        } 

        if (!q.answer) { 
            // The remaining question types should fit this case.
            return true;
        } 
    }

    function _isValid (q /* question */) {
        // if the question has no content and is not required, it is good to go
        if (! q.required) {
            if (_.isArray(q.answer) && (q.answer.length === 0 || (q.answer.length === 1 && q.answer[0].text && q.answer[0].text === 'NO_ANSWER'))) {
                return true;
            } else if (!q.answer || q.type === 'single-select' || q.type === 'multi-select') { 
                return true;
            } // else: validate the answer that is provided.
        }

        if (q.type === 'zipcode') {
            return (/^\d{5}(-\d{4})?$/).test(q.answer);
        }

        if (q.type === 'phone') {
            /* first strip all valid special characters, then counts if there are at least 10 digits */
            return (/^\d{10,}$/).test(q.answer.replace(/[\s()+\-\.]|ext/gi, ''));
        }

        if (q.type === 'url') {
            var exp = /^(https?:\/\/)?([\da-zA-Z\.-]+)\.([\da-zA-Z]{2,6})(\:[\d]{1,5})?\/?.*$/;
            return exp.test(q.answer);
        }

        if (q.type === 'integer' || q.type === 'number' || q.type === 'currency') {
            if (q.type === 'currency') {
                return /^\$?(([0-9]{1,3},([0-9]{3},)*)[0-9]{3}|[0-9]{1,3})(\.[0-9]{2})?$/.test(q.answer);
            }                    
            if (isNaN(q.answer)) {
                return false;
            }
            if (q.integer_max && q.integer_max < q.answer) {
                return false;
            }
            if (q.integer_min && q.integer_min > q.answer) {
                return false;
            }
            if (q.type === 'integer' && _.string.include(q.answer, '.')) {
                return false;
            }
        }

        if (q.type === 'text' || q.type === 'textarea') {
            if (! q.answer) {
                return false;
            }
        }
        var otherAnswers = q.otherAnswers && q.otherAnswers.length && ( ! (q.otherAnswers.length === 1 && q.otherAnswers[0] === "") );
        if (q.type === 'single-select') {
            if (q.groupedOptions && q.groupedOptions.length) {
                var groupedOptions = _.flatten(_.map(q.groupedOptions, function(option) {
                    return option.options;
                }));
                return _.some(_.pluck(groupedOptions, 'checked')) || otherAnswers;      
            } else {
                return _.some(_.pluck(q.options, 'checked')) || otherAnswers;      
            }                    
        } else if ( q.type === 'multi-select' || q.type === 'yes-no' ) {                
            
            var otherEntry = otherAnswers, 
                standardEntry = false;
            
            if (otherEntry) {
                return true;
            } else {
                if (q.groupedOptions && q.groupedOptions.length) {  
                    return _.some(_.pluck(_.flatten(_.map(q.groupedOptions, function (group) { return group.options })), 'checked'));
                } else {
                    return _.some(_.pluck(q.options, 'checked')) || q.otherAnswers.length;        
                }
            }
        }
        
        if (q.type === 'number-with-unit') {
            if (! _.isNumber(q.answer) || ! q.unit) {
                return false;    
            }
        }

       if ((q.type === 'monthpicker' || q.type == 'datepicker' || q.type === 'timepicker')) {
            if (! q.answer || (new Date(scope.q.answer)).add(1).day().clearTime() > (new Date()).clearTime()) {
                return false;    
            }
        }

        if (q.type === 'map-multipoint') {
            if (! _.isArray(q.markers) || q.markers.length < 1) {
                return false;
            }
        }

        if (q.type === 'map-multipolygon') {
            if (! _.isArray(q.answer) || q.answer.length < 1) {
                return false;
            }
        }

        // default case
        return true;
    }

    return {
        templateUrl: app.viewPath + 'views/multiQuestionTypes.html',
        restrict: 'EA',
        // replace: true,
        transclude: true,
        scope: {
            question: '=question',
            pageorder: '=pageorder',
            answers: '=answers',
            syncedValidity: '=validity', // Updated as answer changes.
            showErrors: '='
        },
        link: function postLink(scope, element, attrs) {


            var _isValid_prepared = true;  // Updated when showErrors changes.
            var _isBlank_prepared = false; // Updated when showErrors changes.

            scope.isValid = function () {
                return _isValid_prepared;
            };

            scope.isBlank = function () {
                return _isBlank_prepared;
            };

            scope.isRequired = function () {
                return scope.question.required;
            };


            // Update valid and blank indicators when showErrors changes. Used
            // to determine whether errors are shown.
            scope.$watch('showErrors', function () {
                if (scope.showErrors) {
                    _isValid_prepared = _isValid(scope.question);
                    _isBlank_prepared = _isBlank(scope.question);
                } else {
                    // Default to everything being a-okay.
                    _isValid_prepared = true;
                    _isBlank_prepared = false;
                }
            });


            // Keep a validity value (separate from above) synced every time the 
            // answer changes. Used to update UI styles.
            scope.$watch(function () {
                return _isValid(scope.question);
            }, function () {
                scope.syncedValidity[scope.question.slug] = _isValid(scope.question);
            });


            // get previously answered questions
            scope.getAnswer = function(questionSlug) {
                var slug, gridSlug;
                if (_.string.include(questionSlug, ":")) {
                    slug = questionSlug.split(':')[0];
                    gridSlug = questionSlug.split(':')[1].replace(/-/g, '');
                } else {
                    slug = questionSlug;
                }

                if (scope.answers[slug] || scope.answers[slug] === 0) {
                    if (gridSlug) {
                        return _.flatten(_.map(scope.answers[slug], function(answer) {
                            if (_.isArray(answer[gridSlug])) {
                                return _.map(answer[gridSlug], function(gridAnswer) {
                                    return {
                                        text: answer.text + ": " + gridAnswer,
                                        label: _.string.slugify(answer.text + ": " + gridAnswer),
                                        value: gridAnswer
                                    };
                                });   
                            } else {
                                return answer[gridSlug];
                            }
                        }));
                    } else {
                        return scope.answers[slug];
                    }
                } else {
                    return false;
                }
            };

            scope.getSum = function(slugPackage) {
                //split the string
                var slugList = slugPackage.split(',');
                //map to get the answer for each slug
                //reduce to get the sum
                return _.reduce(_.flatten(_.map(slugList, function(slug) {
                    return scope.getAnswer(slug);
                })), function(sum, value) {                    
                    if (_.isObject(value)) {
                        value = value.value;
                    } else if (! value) {
                        value = 0;
                    }
                    return sum + value;
                });

            };


            // scope.question.otherAnswers = [];
            // handle clicked multiselects
            scope.onMultiSelectClicked = function(option, question) {
                option.checked = !option.checked;
                // if (!option.checked && option.other) {
                //     // $scope.question.otherAnswer1 = null;
                //     // $scope.question.otherAnswer2 = null;                    
                //     // $scope.question.otherAnswer = null;
                //     // $scope.question.otherAnswers[0] = null;
                //     // $scope.question.otherAnswers[1] = null;
                //     // $scope.question.otherAnswers[2] = null;
                // }
                question.answerSelected = _.some(_.pluck(_.flatten(_.map(question.groupedOptions, function(option) {
                    return option.options;
                })), 'checked'));
            };

            // handle single select clicks
            scope.onSingleSelectClicked = function(option, question) {
                // turn off all other options
                if (question.groupedOptions && question.groupedOptions.length) {
                    var groupedOptions = _.flatten(_.map(question.groupedOptions, function(option) {
                        return option.options;
                    }));
                    _.each(_.without(groupedOptions, option), function(option) {
                        option.checked = false;
                    });
                } else {
                    _.each(_.without(question.options, option), function(option) {
                        option.checked = false;
                    });
                }

                if (question.otherOption && option === question.otherOption) {
                    question.otherOption.checked = !question.otherOption.checked;
                } else {
                    if (question.otherOption) {
                        question.otherOption.checked = false;
                    }
                }

                option.checked = !option.checked;

                if (option.checked && option.label) { // if option is checked but it's not an other option, then clear out other option
                    question.otherAnswers = [];
                }

                // if (question.otherAnswers.length) {
                //     option.checked = true;
                // }
                question.answerSelected = option.checked;


                // enable continue
                // if (!question.required || (option.checked && option !== question.otherOption)) {
                //     $scope.isAnswerValid = true;
                // } else {
                //     $scope.isAnswerValid = false;
                // }

            };

            scope.openOption = function(option) {
                _.each(scope.question.groupedOptions, function(groupedOption) {
                    if (groupedOption.optionLabel !== option.optionLabel) {
                        groupedOption.open = false;
                    } else {
                        groupedOption.open = !option.open;
                    }
                });
            }

            // get simple answers
            scope.question.answer = scope.getAnswer(scope.question.slug);

            // set up rows for selects
            if (scope.question.rows) {
                scope.question.options = [];
                _.each(scope.question.rows.split('\n'), function(row, index) {
                    var matches = [],
                        option;
                    if (_.isArray(scope.question.answer)) {
                        matches = _.filter(scope.question.answer, function(answer) {
                            return answer.text === row;
                        });
                    } else if (row === scope.question.answer.text || row === scope.question.answer) {
                        // handle single selects
                        matches = [true];
                    }
                    option = {
                        text: _.string.startsWith(row, '*') ? row.substr(1) : row,
                        label: _.string.slugify(row),
                        checked: matches.length ? true : false,
                        isGroupName: _.string.startsWith(row, '*')
                    };
                    if (option.checked) {
                        scope.question.answerSelected = true;
                    }
                    scope.question.options.push(option);
                });

                scope.question.groupedOptions = [];
                // scope.question.answerSelected = false;
                var groupName = "";
                
                _.each(scope.question.rows.split('\n'), function(row, index) {
                    var matches = [];
                    if (scope.question.answer && scope.question.answer.length) {
                        matches = _.filter(scope.question.answer, function(answer) {
                            return answer.text === row;
                        });                        
                    } else if (scope.question.answer.text === row) {
                        matches = [row];
                    }

                    var isGroupName = _.string.startsWith(row, '*');
                    var group;
                    if (isGroupName) {
                        groupName = row.substr(1);
                        group = {
                            optionLabel: groupName,
                            options: [],
                            open: false
                        };
                        scope.question.groupedOptions.push(group);
                    } else if (scope.question.groupedOptions.length > 0) {
                        group = _.findWhere(scope.question.groupedOptions, {
                            optionLabel: groupName
                        });
                        group.options.push({
                            text: row,
                            label: _.string.slugify(row),
                            groupName: groupName,
                            checked: matches.length ? true : false
                        });
                        if (matches.length) {
                            scope.question.answerSelected = true;
                            group.open = true;
                            // console.log(group.optionLabel);
                        }
                    }
                });

            }

            // set up other option
            if (scope.question.allow_other && scope.question.answer && scope.question.answer.other || _.isArray(scope.question.answer) && _.findWhere(scope.question.answer, { other: true }) ) {
                scope.question.otherOption = {
                    'checked': true,
                    'other': true
                };

                if (scope.question.answer.other) {
                    scope.question.otherAnswers = [];
                    scope.question.otherAnswers[0] = scope.question.answer.text;
                } else {
                    scope.question.otherAnswers = _.where(scope.question.answer, { other: true });
                    _.each(scope.question.otherAnswers, function(answer, i) {
                        scope.question.otherAnswers[i] = answer.text;
                    });
                }

                
                // scope.question.otherAnswer = scope.question.answer.text || _.findWhere(scope.question.answer, {
                //     other: true
                // }).text;
            } else {
                scope.question.otherOption = {
                    'checked': false,
                    'other': true
                };
                // scope.question.otherAnswer = null;
                scope.question.otherAnswers = [];
            }        

            // set up the options for a yes-no question
            if (scope.question.type === 'yes-no') {
                scope.question.options = [
                    {'text': 'Yes', 'label': "Yes"}, 
                    {'text': 'No',  'label': "No"}
                ];
                // set selected value (the answer is coming in with varying forms)
                if (scope.question.answer) {
                    var ans = scope.question.answer,
                        distilled_answer = false;
                    if (_.isArray(ans)) {
                        distilled_answer = ans[0].text;
                    } else if (_.isString(ans)) {
                        distilled_answer = ans;
                    } else if (!_.isArray(ans)) {
                        distilled_answer = ans.text;
                    }
                    scope.question.options[0].checked = distilled_answer === 'Yes';
                    scope.question.options[1].checked = distilled_answer === 'No';
                }
            }



            // get answers
            if (scope.question.type === 'number-with-unit') {
                scope.question.unit = scope.question.answer.unit;
                scope.question.answer = scope.question.answer.value;
            } else if (scope.question.type === 'integer') {
                scope.question.answer = parseInt(scope.getAnswer(scope.question.slug), 10);
            } else if (scope.question && scope.question.options.length) {
                scope.question.answer = scope.getAnswer(scope.question.slug);
                // check to make sure answer is in options
                if (scope.question.answer && !_.isArray(scope.question.answer)) {
                    scope.question.answer = [scope.question.answer];
                }
            }
            // end of getting answers

            if (scope.question.pre_calculated && !scope.question.answer) {
                scope.question.answer = scope.getSum(scope.question.pre_calculated);
            }

            // remove false answers

            if (!scope.question.answer && scope.question.answer !== 0) {
                delete scope.question.answer;
            }

            if (scope.question.type === 'single-select' || scope.question.type === 'yes-no') {
                scope.question.answerSelected = _.some(_.pluck(scope.question.options, 'checked'));
                // if (scope.question.allow_other && scope.question.answer && scope.question.answer.other || _.isArray(scope.question.answer) && _.findWhere(scope.question.answer, {other: true })) {
                if (scope.question.answer)  {
                    scope.question.answerSelected = true;
                }
            } else if (scope.question.type === 'multi-select') {
                scope.question.answerSelected = _.some(_.pluck(_.flatten(_.map(scope.question.groupedOptions, function(option) {
                    return option.options;
                })), 'checked'));
            }

            scope.$watch('question.otherAnswers', function (newVal, oldVal) {
                if (scope.question.type == 'single-select' && scope.question.allow_other && scope.question.otherAnswers.length && scope.question.otherAnswers[0] !== "") {
                    scope.onSingleSelectClicked({checked: false}, scope.question);
                } else if (scope.question.type == 'single-select' && scope.question.allow_other) {
                    // scope.onSingleSelectClicked({checked: true}, scope.question);
                    // argh...basically: if there is not an other answer and no regular answer is checked, then answerSelected should be false
                    // i believe the original intention of this was to ensure that when a user removed an other option the selectable items were styled correctly
                    if ( (!newVal.length || newVal[0]==="") && !_.some(_.pluck(scope.question.options, 'checked')) ) {  
                        scope.question.answerSelected = false;    
                    }                    
                }
            }, true);

            if (scope.question && scope.question.type && scope.question.type === 'info') {
                scope.viewPath = app.viewPath;
                scope.infoView = scope.question.info;
                scope.question.answer = "INFO_ANSWER"; // Dummy answer that allows the page to be submitted.
            }


            $('.not-public-icon').tooltip();
        }
    };
});