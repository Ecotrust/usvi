from django.conf.urls import *
from survey.views import *


urlpatterns = patterns('',
    (r'delete/(?P<uuid>[\w\d-]+)', delete_responses),
    (r'delete-incomplete/(?P<uuid>[\w\d-]+)', delete_incomplete_respondent),
    url(r'/answer/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)', answer, name='survey_answer'),
    (r'/setProfileResponses/(?P<survey_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)', set_profile_responses),
    (r'/submitPage/(?P<survey_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)', submit_page),
    (r'/complete/(?P<survey_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)/(?P<action>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', complete),
    (r'/complete/(?P<survey_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)', complete),

)
