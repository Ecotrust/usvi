
angular.module('askApp')
  .factory('chartUtils', function ($http, dashData) {


    var buildStackedBarChart = function (surveySlug, questionSlug, filters, setChart_callback, options) {
        var url = '';
        
        var onDataFail = function (data) { debugger; };

        var onDataSuccess = function (data) {
            var chartConfig = {
                labels: _.pluck(data.answer_domain, "answer_text"),
                displayTitle: false,
                yLabel: options.yLabel,
                title: options.title,
                categories: [""],
                type: "stacked-column",
                data: _.pluck(data.answer_domain, "surveys"),
                download_url: url + '.csv',
                unit: options.unit || "projects"
            };
            setChart_callback(chartConfig);
        };

        url = dashData.getDistribution(surveySlug, questionSlug, filters, onDataSuccess, onDataFail);
    }


    return {
        'buildStackedBarChart': buildStackedBarChart
    };
});
