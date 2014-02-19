angular.module('askApp')
    .directive('dateRangePicker', function($q) {

        return {
            template: '<div><i class="icon-calendar icon-large"></i> <span ng-bind="displayMin"></span> to <span ng-bind="displayMax"></span></div>',
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                min: "=min",
                max: "=max",
                start: "=start",
                end: "=end"

            },
            link: function(scope, element, attrs) {
                var min, max;
                var initializePicker = _.once(function(start, end) {
                    // element.val(_.string.sprintf("%s - %s", start, end));
                    var deferred = $q.defer();
                    element.daterangepicker({
                        format: 'MM-DD-YYYY',
                        startDate: start,
                        endDate: end,
                        minDate: start,
                        maxDate: end,
                        opens: 'left',
                        showDropdowns: true,
                        ranges: {
                            'All Dates': [start, end],
                            'Today': [moment(), moment()],
                            'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
                            'Last 7 Days': [moment().subtract('days', 6), moment()],
                            'Last 30 Days': [moment().subtract('days', 29), moment()],
                            'This Month': [moment().startOf('month'), moment().endOf('month')],
                            'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
                        }
                    }, function(start, end) {
                        if (start !== scope.start) {
                            scope.$apply(function(s) {
                                s.start = start;
                                s.displayMin = (new Date(start)).toString('MMM dd, yyyy');
                            });    
                        }
                        if (end !== scope.end) {
                            scope.$apply(function(s) {
                                s.end = end;
                                s.displayMax = (new Date(end)).toString('MMM dd, yyyy')
                            });
                        }
                    });
                });

                scope.$watch('min', function(newValue) {
                    if (newValue) {
                        scope.displayMin = (new Date(newValue)).toString('MMM dd, yyyy');
                        min = (new Date(newValue)).toString('MM-dd-yyyy');
                        if (max && min) {
                            initializePicker(min, max);
                        }
                    }

                });
                scope.$watch('max', function(newValue) {
                    if (newValue) {
                        scope.displayMax = (new Date(newValue)).toString('MMM dd, yyyy');
                        max = (new Date(newValue)).toString('MM-dd-yyyy');
                        if (max && min) {
                            initializePicker(min, max);
                        }
                    }
                });
                scope.$watch('start', function (newValue) {
                    if (newValue) {
                        scope.displayMin = (new Date(newValue)).toString('MMM dd, yyyy');    
                    }
                    
                });
                scope.$watch('end', function (newValue) {
                    if (newValue) {
                        scope.displayMax = (new Date(newValue)).toString('MMM dd, yyyy');    
                    }
                    
                });
            }
        }
    });



angular.module('askApp')
    .directive('password', function() {

        return {
            templateUrl: app.viewPath + 'views/password.html',
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                passwordText: "=passwordText",
                placeholderText: "=placeholderText"
            },
            link: function(scope, element, attrs) {
                scope.visible = false;
                scope.element = element;

                scope.toggleVisible = function() {
                    scope.visible = !scope.visible;



                }
            }
        }
    });

angular.module('askApp')
    .directive('progress', function() {

        return {
            templateUrl: app.viewPath + 'views/progress.html',
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                value: "=value",
                max: "=max"
            },
            link: function(scope, element, attrs) {
                scope.percent = (scope.value / scope.max) * 100;
            }
        }
    });

angular.module('askApp')
    .directive('speciesSelect', function($http) {

        return {
            template: '<input type="text" class="form-control" placeholder="Species" ng-model="species.name">',
            scope: {
                species: "=species"
            },
            transclude: true,
            link: function(scope, element, attrs) {
                var cache = {}, index = {};
                element.find('input').autocomplete({
                    minLength: 2,
                    select: function(event, ui) {
                        scope.$apply(function(s) {
                            s.species = index[ui.item.label];
                        });
                    },
                    source: function(request, response) {
                        var term = request.term;
                        if (term in cache) {
                            response(cache[term]);
                            return;
                        }
                        $http.get("/api/v1/species/?format=json").success(function(data) {
                            var results = [];
                            _.each(data.objects, function(item) {
                                var label = item.name + ' (' + item.code + ')'
                                results.push({
                                    value: label,
                                    label: label
                                });
                                index[label] = item;
                            });
                            cache[term] = results;
                            response(results);
                        });
                    }
                });
            }
        }
    });

angular.module('askApp')
    .directive('aclPieChart', [function() {
        'use strict';

        return {
            restrict: 'EA',

            // sets up the isolate scope so that we don't clobber parent scope
            scope: {
                outerRadius: '=',
                innerRadius: '=',
                fontSize: '=',
                domain: '=',
                colorMap: '=',
                onClick: '=',
                bind: '=',
                duration: '@'
            },

            link: function(scope, element, attrs) {

                // Setup default parameters.
                var outerRadius = scope.outerRadius || 200;
                var innerRadius = scope.innerRadius || 0;
                var fontSize = scope.fontSize || 24;
                var fontColor = attrs.fontColor || "#fff";
                var color = undefined;

                // if no field param is set, use the facet name but normalize the case
                if (attrs.field == undefined) {
                    attrs.field = attrs.bind.split('.').pop().toLowerCase();
                }

                // User can define a color-map so use look for one.
                // If none is found, then use built-in color pallete
                // but see if user has defined a domain of values.
                if (scope.colorMap === undefined) {
                    color = d3.scale.category20c();
                    if (scope.domain !== undefined) {
                        color.domain(scope.domain);
                    }
                } else {
                    color = function(term) {
                        return scope.colorMap[term];
                    }
                }
                // width/height (based on giveb radius)
                var w = (outerRadius * 3) + 30;
                var h = outerRadius * 3;

                // arc generator 
                var arc = d3.svg.arc()
                    .outerRadius(outerRadius - 10)
                    .innerRadius(innerRadius);

                // d3 utility for creating pie charts
                var pie = d3.layout.pie()
                    .sort(null)
                    .value(function(d) { return d.count; });

                // root svg element
                var svg = d3.select(element[0])
                    .append('svg')
                        .attr('preserveAspectRatio', 'xMinYMin meet')
                        .attr('viewBox', '0 0 ' + w + ' ' + h);

                // group for arcs
                var arcs = svg.append('g')
                    .attr('transform', 'translate(' + w/2 + ',' + h/2 + ') rotate(180) scale(-1, -1)');

                // group for labels
                var labels = svg.append("g")
                    .attr("class", "label_group")
                    .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")");


                // Wrap the main drawing logic in an Angular watch function.
                // This will get called whenever our data attribute changes.
                scope.$watch('bind', function(data) {

                    var duration = scope.duration || 0;

                    // arc tweening
                    function arcTween(d, i) {
                        var i = d3.interpolate(this._current, d);
                        this._current = i(0);
                        return function(t) {
                            return arc(i(t));
                        };
                    }
        
                    // label tweening
                    function textTween(d, i) {
                        var a = (this._current.startAngle + this._current.endAngle - Math.PI)/2;
                        var b = (d.startAngle + d.endAngle - Math.PI)/2;

                        var fn = d3.interpolateNumber(a, b);
                        return function(t) {
                            var val = fn(t);
                            return "translate(" + 
                                Math.cos(val) * (outerRadius + textOffset) + "," + 
                                Math.sin(val) * (outerRadius + textOffset) + ")";
                        };
                    }

                    // determines the anchor point of a label
                    var findAnchor = function(d) {
                        if ((d.startAngle + d.endAngle)/2 < Math.PI ) {
                            return "beginning";
                        } else {
                            return "end";
                        }
                    };

                    var textOffset = 14;

                    // if data is not null
                    if (data) { 

                        // pull out the terms array from the facet
                        data = data.terms || [];
                        var pieData = pie(data);

                        // calculate the sum of the counts for this facet
                        var sum = 0;
                        for (var ii=0; ii < data.length; ii++) {
                            sum += data[ii].count;
                        }

                        // if the sum is 0 then this facet has no valid entries (all counts were zero)
                        if (sum > 0) {

                            // update the arcs
                            var path = arcs.selectAll('path').data(pieData);
                            path.enter()
                                .append('path') 
                                    .attr('d', arc)
                                    .attr('stroke', '#fff')
                                    .attr('stroke-width', '1.5')
                                    .attr('cursor', 'pointer')
                                    .style('fill', function(d) { return color(d.data.term); })
                                    .each(function(d) { this._current = d; })
                                    .on('mousedown', function(d) {
                                        scope.$apply(function() {
                                            (scope.onClick || angular.noop)(attrs.field, d.data.term);
                                        });
                                    })
                                    .on("mouseover", function(d) {
                                            $(this).tooltip({ 
                                                'container': 'body',
                                                'placement': 'bottom',
                                                title: d.data.term + " " + d.data.count + " lbs"
                                            });
                                            $(this).tooltip('show');
                                        })
                                    .on("mouseout", function(d) {       
                                            $(this).tooltip('hide');
                                        })
                            // run the transition
                            path.transition().duration(duration).attrTween('d', arcTween);

                            // update the label ticks
                            var ticks = labels.selectAll('line').data(pieData);
                            ticks.enter().append('line')
                                .attr('x1', 0)
                                .attr('x2', 0)
                                .attr('y1', -outerRadius-3)
                                .attr('y2', -outerRadius-8)
                                .attr('stroke', 'grey')
                                .attr('stroke-width', 2.0)
                                .attr('transform', function(d) {
                                    return 'rotate(' + (d.startAngle + d.endAngle)/2 * (180/Math.PI) + ')'; // radians to degrees
                                })
                                .each(function(d) {this._current = d;});

                            // run the transition
                            ticks.transition()
                                .duration(750)
                                .attr("transform", function(d) {
                                    return "rotate(" + (d.startAngle+d.endAngle)/2 * (180/Math.PI) + ")";
                            });

                            // flush old entries
                            ticks.exit().remove();

                            // update the percent labels
                            var percentLabels = labels.selectAll("text.value").data(pieData)
                                .attr("dy", function(d) {
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 17;
                                    } else {
                                        return -17;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d) {
                                    var percentage = (d.value/sum)*100;
                                    return percentage.toFixed(1) + "% (" + d.value + " lbs)";
                                });

                            percentLabels.enter().append("text")
                                .attr("class", "value")
                                .attr('font-size', 24)
                                .attr('font-weight', 'bold')
                                .attr("transform", function(d) {
                                    return "translate(" + 
                                        Math.cos(((d.startAngle + d.endAngle - Math.PI)/2)) * (outerRadius + textOffset) + "," + 
                                        Math.sin((d.startAngle + d.endAngle - Math.PI)/2) * (outerRadius + textOffset) + ")";
                                })
                                .attr("dy", function(d) {
                                    if ((d.startAngle+d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 17;
                                    } else {
                                        return -17;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d){
                                    var percentage = (d.value/sum)*100;
                                    return percentage.toFixed(1) + "% (" + d.value + " lbs)";
                                })
                                .each(function(d) {this._current = d;});
                           
                            // run the transition
                            percentLabels.transition().duration(duration).attrTween("transform", textTween);

                            // flush old entries
                            percentLabels.exit().remove();

                            // update the value labels 
                            var nameLabels = labels.selectAll("text.units").data(pieData)
                                .attr("dy", function(d){
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle+d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 36;
                                    } else {
                                        return 2;
                                    }
                                })
                                .attr("text-anchor", function(d){
                                    if ((d.startAngle + d.endAngle)/2 < Math.PI ) {
                                        return "beginning";
                                    } else {
                                        return "end";
                                    }
                                }).text(function(d) {
                                    if (d.data.term === 'T') {
                                        return 'TRUE' + ' (' + d.value + ')';
                                    } else if (d.data.term === 'F') {
                                        return 'FALSE'+ ' (' + d.value + ')';
                                    } else {
                                        return d.data.term + ' (' + d.value + ')';
                                    }
                                });

                            nameLabels.enter().append("text")
                                .attr("class", "units")
                                .attr('font-size', 18)
                                .attr('stroke', 'none')
                                .attr('fill', '#000')
                                .attr("transform", function(d) {
                                    return "translate(" + 
                                        Math.cos(((d.startAngle + d.endAngle - Math.PI)/2)) * (outerRadius + textOffset) + "," + 
                                        Math.sin((d.startAngle + d.endAngle - Math.PI)/2) * (outerRadius + textOffset) + ")";
                                })
                                .attr("dy", function(d){
                                    if ((d.startAngle + d.endAngle)/2 > Math.PI/2 && (d.startAngle + d.endAngle)/2 < Math.PI*1.5 ) {
                                        return 36;
                                    } else {
                                        return 2;
                                    }
                                })
                                .attr('text-anchor', findAnchor)
                                .text(function(d){
                                    if (d.data.term === 'T') {
                                        return 'TRUE' + ' (' + d.value + ')';
                                    } else if (d.data.term === 'F') {
                                        return 'FALSE' + ' (' + d.value + ')';
                                    } else {
                                        return d.data.term + ' (' + d.value + ')';
                                    }
                                })
                                .each(function(d) {this._current = d;});

                            // run the transition
                            nameLabels.transition().duration(duration).attrTween("transform", textTween);
    
                            // flush old entries
                            nameLabels.exit().remove();

                        } else {
                            // if the facet had no valid entries then remove the chart
                            svg.selectAll('path').remove();
                            labels.selectAll('line').remove();
                            labels.selectAll("text.value").remove();
                            labels.selectAll("text.units").remove();
                        }

                    }
                })

            }
        };
    }]);