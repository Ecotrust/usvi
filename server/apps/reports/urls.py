from django.conf.urls import *
from reports.views import *
from places.models import Area
from reports.views import (full_data_dump_csv)

urlpatterns = patterns('',

                       (r'/distribution/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[*\w\d-]+)',
                        get_distribution),
                       (r'/geojson/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)',
                        get_geojson),
                       (r'/crosstab/(?P<survey_slug>[\w\d-]+)/(?P<question_a_slug>[\w\d-]+)/(?P<question_b_slug>[\w\d-]+)',
                        get_crosstab),
                       (r'/respondants_summary/', get_respondants_summary),
                       url("areas.geojson$", MapLayer.as_view(model=Area, properties=['id'])),

                       url(r'/full-survey-data/(?P<survey_slug>[\w\d-]+)',
                           full_data_dump_csv,
                           name='reports_full_data_dump_csv'),

)
