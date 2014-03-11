from django.conf.urls import *
from reports.views import *


urlpatterns = patterns('',
    (r'/distribution/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', get_distribution),
    (r'/crosstab/(?P<survey_slug>[\w\d-]+)/(?P<question_a_slug>[\w\d-]+)/(?P<question_b_slug>[\w\d-]+).csv', get_crosstab_csv),
    (r'/crosstab/(?P<survey_slug>[\w\d-]+)/(?P<question_a_slug>[\w\d-]+)/(?P<question_b_slug>[\w\d-]+)', get_crosstab_json),
    (r'/geojson/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', get_geojson),
    (r'/respondants_summary/', get_respondants_summary),

    url(r'/full-survey-data/(?P<survey_slug>[\w\d-]+)',
        full_data_dump_csv,
        name='reports_full_data_dump_csv'),

    url(r'/activity-location-data/(?P<survey_slug>[\w\d-]+)',
        activity_locations_csv,
        name='reports_activity_locations_csv'),
)
