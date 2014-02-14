//'use strict';

var app = {};

app.server = window.location.protocol + '//' + window.location.host;
app.viewPath = app.server + '/static/survey/';
angular.module('askApp', ['ngRoute', 'mgcrea.ngStrap.datepicker', 'mgcrea.ngStrap.tooltip',
    'mgcrea.ngStrap.button', "ui.bootstrap.tpls", "ui.bootstrap.modal"]) //'ui', 'ui.bootstrap',
    .config(function($routeProvider, $httpProvider) {

    $httpProvider.defaults.headers.post['Content-Type'] = 'application/json';
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';

    $routeProvider.when('/author/:surveySlug', {
        templateUrl: '/static/survey/views/author.html',
        controller: 'AuthorCtrl',
        reloadOnSearch: false
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
        .when('/RespondantList/:surveySlug', {
        templateUrl: '/static/survey/views/RespondantList.html',
        controller: 'RespondantListCtrl',
        reloadOnSearch: false

    })
        .when('/agency-dash/:surveySlug', {
        templateUrl: '/static/survey/views/agency-dash.html',
        controller: 'AgencyDashCtrl'
    })
        .when('/RespondantDetail/:surveySlug/:uuidSlug', {
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
        .when('/', {
        templateUrl: '/static/survey/views/acl-progress.html',
        controller: 'AnnualCatchLimitProgressCtrl',
        reloadOnSearch: false
    })
        .when('/admin', {
        templateUrl: '/static/survey/views/survey-list.html',
        controller: 'SurveyListMenuCtrl'
    })
        .otherwise({
        redirectTo: '/'
    });
});