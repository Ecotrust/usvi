
angular.module('askApp')
  .factory('chartUtils', function ($http, dashData) {


    var buildStackedBarChart = function (surveySlug, questionSlug, filters, options, setChart_callback, onFail_callback) {

        var onDataFail = function (data) { 
            debugger; 
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
                download_url: data.csvUrl,
                unit: options.unit || "projects"
            };
            setChart_callback(chartConfig);
        };

        dashData.getDistribution(surveySlug, questionSlug, filters, onDataSuccess, onDataFail);
    }


    return {
        'buildStackedBarChart': buildStackedBarChart
    };
});
