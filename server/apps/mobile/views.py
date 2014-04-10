from django.http import HttpResponse
from django.conf import settings
import simplejson
import re


def getVersion(request):
    with open(settings.PROJECT_ROOT / '../mobile/www/config.xml') as f:
        content = f.read()
        version = re.search('version="(\d+\.\d+\.\d+)"', content).group(1)
    return HttpResponse(simplejson.dumps({
        'success': True,
        'version': version,
        'path': '/downloads/update.html'
    }))
