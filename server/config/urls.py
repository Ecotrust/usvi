from django.conf.urls import *

from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponseRedirect

from tastypie.api import Api

from apps.survey import urls as survey_urls
from apps.reports import urls as report_urls

from apps.survey.api import *
from apps.reports.api import *
from apps.places.api import *
from apps.account.api import *

v1_api = Api(api_name='v1')


v1_api.register(PlanningUnitResource())
v1_api.register(SurveyResource())
v1_api.register(RespondantResource())
v1_api.register(ReportRespondantResource())
v1_api.register(ReportRespondantDetailsResource())
v1_api.register(OfflineRespondantResource())
v1_api.register(OfflineResponseResource())
v1_api.register(PlaceResource())
v1_api.register(QuestionResource())
v1_api.register(ResponseResource())
v1_api.register(PageResource())
v1_api.register(OptionResource())
v1_api.register(UserResource())
v1_api.register(BlockResource())
v1_api.register(DashRespondantResource())
v1_api.register(DashRespondantDetailsResource())
v1_api.register(CompleteRespondantResource())
v1_api.register(IncompleteRespondantResource())

v1_api.register(SurveyReportResource())

admin.autodiscover()

urlpatterns = patterns('',
    url(r'^accounts/login/$', 'django.contrib.auth.views.login',name="my_login"),
    url(r'^logout/(?P<next_page>.*)/$', 'django.contrib.auth.views.logout', name='auth_logout_next'),
    url(r'^logout/$', 'django.contrib.auth.views.logout', {'next_page': '/'}, name='auth_logout'),
    url(r'^grappelli/', include('grappelli.urls')),
    (r'^api/', include(v1_api.urls)),


    url(r'^admin/password_reset/$', 'django.contrib.auth.views.password_reset', name='admin_password_reset'),
    (r'^admin/password_reset/done/$', 'django.contrib.auth.views.password_reset_done'),
    (r'^reset/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$', 'django.contrib.auth.views.password_reset_confirm'),
    (r'^reset/done/$', 'django.contrib.auth.views.password_reset_complete'),
    url(r'^admin/', include(admin.site.urls)),

    url('', include('social.apps.django_app.urls', namespace='social')),

    url(r'^account/', include('apps.account.urls')),
    url(r'^mobile/', include('apps.mobile.urls')),
    url(r'^report/', include(report_urls)),
    url(r'^reports', include(report_urls)),

    #
    # Temporary Outage message
    # IF NOT COMMENTED OUT THIS WILL PREVENT USERS FROM BEING
    # ABLE TO ACCESS THE SURVEY.
    #
    url(r'^respond', 'apps.survey.views.outage'),

    #anon survey user for specific survey
    url(r'^respond/(?P<survey_slug>[\w\d-]+)$', 'apps.survey.views.survey'),
    #survey responder with preassigned uuid
    url(r'^respond$', 'apps.survey.views.survey'),
    #other survey urls
    url(r'^respond', include(survey_urls)),

    url(r'fisher/(?P<uuid>[\w\d-]+)', 'apps.survey.views.fisher', name="fisher-dash-detail"),
    url(r'^fisher', 'apps.survey.views.fisher', name="fisher-dash"),

    url(r'^dash$', 'apps.survey.views.dash', name='dashboard'),
    url(r'^dash', 'apps.survey.views.dash'),
    url(r'^dash/', 'apps.survey.views.dash'),

    # Redirect / to /dash
    url(r'^$', lambda r: HttpResponseRedirect('/dash')),
)

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
