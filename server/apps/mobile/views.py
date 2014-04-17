from django.http import HttpResponse
from django.conf import settings
import simplejson
import re
from django.db.models import F
from django.db.models import Q

def getMessages(request):
    with open(settings.PROJECT_ROOT / '../mobile/www/config.xml') as f:
        content = f.read()
        version = re.search('version="(\d+\.\d+\.\d+)"', content).group(1)
    messages = {
        'success': True,
        'version': version,
        'path': '/static/survey/mobile.html#/update'
    }
    if request.user.is_authenticated and not request.user.is_anonymous:
        respondants = request.user.respondant_set.filter(notify=True)
        flagged_count = respondants.filter(review_status='flagged').count()
        query = Q(notify_seen_at__isnull=True) | Q(updated_at__gt=F('notify_seen_at'))

        messages['notification_count'] = respondants.filter(query).count()
        messages['flagged_count'] = flagged_count
    return HttpResponse(simplejson.dumps(messages))
