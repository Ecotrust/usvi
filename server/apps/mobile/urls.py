from django.conf.urls import *
from views import *


urlpatterns = patterns('',
                       (r'^getMessages', getMessages),
                       (r'^getVersion', getMessages),
                       )
