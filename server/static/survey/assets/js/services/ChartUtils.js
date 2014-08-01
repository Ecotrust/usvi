
angular.module('askApp')
  .factory('chartUtils', function ($http, dashData) {


    var buildStackedBarChart = function (surveySlug, questionSlug, filters, options, setChart_callback, onFail_callback) {

        var onDataFail = function (data) { 
            onFail_callback(data);
        };

        var onDataSuccess = function (data) {
            var chartConfig = {
                labels: _.pluck(data.answer_domain, "answer"),
                displayTitle: false,
                yLabel: options.yLabel,
                title: options.title,
                categories: [""],
                type: "stacked-column",
                data: _.pluck(data.answer_domain, "surveys"),
                download_url: app && app.user && app.user.is_staff ? data.csvUrl : '',
                unit: options.unit || "projects"
            };
            setChart_callback(chartConfig);
        };

        dashData.getDistribution(surveySlug, questionSlug, filters, onDataSuccess, onDataFail);
    };


    var buildPieChart = function (surveySlug, questionSlug, filters, options, setChart_callback, onFail_callback) {

        var onDataFail = function (data) { 
            debugger; 
            onFail_callback(data);
        };

        var onDataSuccess = function (data) {
            // Format data for highcharts.
            var formattedData = [];
            _.each(data.answer_domain, function (item) {
                formattedData.push([item.answer, item.surveys]);
            });

            // Put all [Other] answers into a single group.
            var othersGroup = ['Other', 0];
            _.each(formattedData, function (grouping, i) {
                if (grouping[0].substr(0,7) == '[Other]') {
                    othersGroup[1]++;
                    formattedData[i][1] = 0;
                }
            });
            formattedData = _.reject(formattedData, function (item) {
                return item[1] === 0;
            });
            if (othersGroup[1] > 0) {
                formattedData.push(othersGroup);
            }

            var chartConfig = {
                data: formattedData,
                download_url: app && app.user && app.user.is_staff ? data.csvUrl : '',
                title: options.title,
                displayTitle: false,
                yLabel: options.yLabel,
                unit: options.unit || "projects"
            };
            setChart_callback(chartConfig);
        };

        dashData.getDistribution(surveySlug, questionSlug, filters, onDataSuccess, onDataFail);
    };


    return {
        'buildStackedBarChart': buildStackedBarChart,
        'buildPieChart': buildPieChart
    };
});
