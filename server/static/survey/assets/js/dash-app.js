//'use strict';

var app = {};

app.server = window.location.protocol + '//' + window.location.host;
app.viewPath = app.server + '/static/survey/';

angular.module('askApp', ['ngRoute', 'mgcrea.ngStrap.datepicker', 'mgcrea.ngStrap.tooltip', 'mgcrea.ngStrap.helpers.dimensions',
    'mgcrea.ngStrap.button', "ui.bootstrap.tpls", "ui.bootstrap.modal", "ui.bootstrap.pagination"]) //'ui', 'ui.bootstrap',
    .config(function($routeProvider, $httpProvider) {

    $httpProvider.defaults.headers.post['Content-Type'] = 'application/json';
    $httpProvider.defaults.headers.patch = {
        'Content-Type': 'application/json;charset=utf-8'
    };
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
    

    // Initial Landing page and controller is determined by user type
    var landingTemplate, landingController;
    if (app.user.is_staff){
        landingTemplate = '/static/survey/views/acl-progress.html';
        landingController = 'AnnualCatchLimitProgressCtrl';
    } else {
        landingTemplate ='/static/survey/views/catch-report-summaries.html';
        landingController = 'CatchReportSummariesCtrl';
    }


    $routeProvider.when('/author/:surveySlug', {
        templateUrl: '/static/survey/views/author.html',
        controller: 'AuthorCtrl',
        reloadOnSearch: false
    })
        .when('/', {
        templateUrl: landingTemplate,
        controller: landingController
    })
        .when('/author', {
        templateUrl: '/static/survey/views/author.html',
        controller: 'AuthorCtrl',
        reloadOnSearch: false
    })
        .when('/surveys', {
        templateUrl: '/static/survey/views/SurveyList.html',
        controller: 'SurveyListCtrl'
    })
        .when('/survey/:surveySlug/complete/:uuidSlug', {
        templateUrl: '/static/survey/views/complete.html',
        controller: 'CompleteCtrl'
    })
        .when('/survey/:surveySlug/complete/:uuidSlug/:action/:questionSlug', {
        templateUrl: '/static/survey/views/complete.html',
        controller: 'CompleteCtrl'
    })
        .when('/survey/:surveySlug/:questionSlug/:uuidSlug', {
        templateUrl: '/static/survey/views/SurveyDetail.html',
        controller: 'SurveyDetailCtrl'
    })
        .when('/survey/:surveySlug/:uuidSlug', {
        templateUrl: '/static/survey/views/landing.html',
        controller: 'SurveyDetailCtrl'
    })
        .when('/RespondantList', {
        templateUrl: '/static/survey/views/RespondantList.html',
        controller: 'RespondantListCtrl',
        reloadOnSearch: false
    })
        .when('/agency-dash/:surveySlug', {
        templateUrl: '/static/survey/views/agency-dash.html',
        controller: 'AgencyDashCtrl'
    })
        .when('/fisher-dash', {
        templateUrl: '/static/survey/views/fisher-dash.html',
        controller: 'FisherDashCtrl'
    })
        .when('/RespondantDetail/:uuidSlug', {
        templateUrl: '/static/survey/views/RespondantDetail.html',
        controller: 'RespondantDetailCtrl'
    })
        .when('/acl', {
        templateUrl: '/static/survey/views/acl-list.html',
        controller: 'AnnualCatchLimitListCtrl'
    })
        .when('/acl/:id', {
        templateUrl: '/static/survey/views/acl-detail.html',
        controller: 'AnnualCatchLimitDetailCtrl'
    })
        .when('/acl-progress', {
        templateUrl: '/static/survey/views/acl-progress.html',
        controller: 'AnnualCatchLimitProgressCtrl',
        reloadOnSearch: false
    })
        .when('/admin', {
        templateUrl: '/static/survey/views/survey-list.html',
        controller: 'SurveyListMenuCtrl'
    })
        .when('/accounts', {
        templateUrl: '/static/survey/views/account/user-list.html',
        controller: 'UserListCtrl'
    })
        .when('/accounts/:username', {
        templateUrl: '/static/survey/views/account/account-detail.html',
        controller: 'AccountsCtrl'
    })
        .when('/add-catch-report', {
        templateUrl: '/static/survey/views/add-catch-report.html',
        controller: 'AddCatchReportCtrl'
    })
        .when('/catch-report-summaries', {
        templateUrl: '/static/survey/views/catch-report-summaries.html',
        controller: 'CatchReportSummariesCtrl'
    })
        .otherwise({
        redirectTo: '/'
    });
});