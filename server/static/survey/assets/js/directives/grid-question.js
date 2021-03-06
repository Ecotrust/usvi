angular.module('askApp').directive('gridquestion', function($timeout) {
    return {
        templateUrl: app.viewPath + 'views/gridQuestion.html',
        restrict: 'EA',
        scope: {
            question: '=',
            answers: '=',
            validity: '=',
            pageOrder: '=pageorder'
        },
        controller: function gridQuestionController($scope) {
            // Validates this question
            $scope.validateQuestion = function() {
                var valid = true;
                _.each($scope.question.answer, function (row) {
                    _.each($scope.question.grid_cols, function (col) {
                        var answer = row[makeLabel(col.label)];
                        if (col.required && !answer) {
                            if (!col.either_or) {
                                valid = false;
                            } else if (!row[col.either_or]) {
                                valid = false;
                            }

                        }
                    });
                });
                return valid;
            };

            // Copy/pasted for now
            $scope.getAnswer = function(slug) {
                return $scope.answers[slug] || false;
            };

            function makeLabel(text) {
                return text.toLowerCase().replace('-', '');
            }

            // var rowTitles = $scope.question.rows.split('\n');
            if ($scope.question.options_from_previous_answer) {
                var answersFromPrevious = $scope.getAnswer($scope.question.options_from_previous_answer);
                // rowTitles = rowTitles.concat(_.pluck(answersFromPrevious, 'text'));
            }
            $scope.grid = {
                rows: _.map(answersFromPrevious, function(row) {
                    return {
                        text: row.text,
                        label: makeLabel(row.text),
                        code: row.code,
                        cells: _.map($scope.question.grid_cols, function(col) {
                            var cell = {
                                type: col.type,
                                required: col.required,
                                min: col.min,
                                max: col.max,
                                either_or: col.either_or,
                                label: makeLabel(col.label)
                            };
                            cell.inputType = {
                                'integer': 'number',
                                'number': 'number',
                                'currency': 'number',
                                'yes-no': 'checkbox',
                                'single-select': 'select',
                                'multi-select': 'multi-select'
                            }[cell.type] || 'text';
                            if (cell.type == 'single-select' || cell.type == 'multi-select') {
                                cell.options = col.rows.split('\n');
                            }
                            return cell;
                        })
                    }
                }),
                colWidth: 100 / ($scope.question.grid_cols.length + 1) + '%'
            };

            $scope.question.answer = $scope.getAnswer($scope.question.slug);
            if (! $scope.question.answer) {
                $scope.question.answer = [];
            }
            var answerLabels = _.map($scope.question.answer, function (answer, index) {
                return {
                    label: answer.label,
                    index: index
                }
            });
            _.each(answerLabels, function (answer) {
                if (! _.findWhere($scope.grid.rows, {label : answer.label })) {
                    $scope.question.answer.splice(answer.index, 1);
                    console.log('removing '+ answer.label);
                }
            });
            _.each($scope.grid.rows, function(row) {
                var previousAnswer = _.findWhere($scope.question.answer, { label: row.label});
                var newAnswer;

                if (previousAnswer) {
                    row.answer = previousAnswer;
                } else {
                    newAnswer = {
                        text: row.text,
                        label: row.label,
                        checked: true,
                        code: row.code
                    };
                    _.each($scope.question.grid_cols, function(col) {
                        newAnswer[makeLabel(col.label)] = null;
                    });
                    row.answer = newAnswer;
                    $scope.question.answer.push(newAnswer);
                }
            });

            $scope.$watch('question.answer', function watchGridQuestion(newAnswer) {
                if (newAnswer) {
                    var valid = $scope.validateQuestion();
                    $scope.validity[$scope.question.slug] = valid;
                }
            }, true);
        },
        link: function link(scope, element, attrs) {
            // Set the width of the columns based on the number of total columns in the grid.
            // We're using $timeout due to async rendering by AngularJS.
            // See: http://stackoverflow.com/q/11125078/104184
            $timeout(function() {
                element.find('.cell').css('width', scope.grid.colWidth);
            });
        }
    };
});