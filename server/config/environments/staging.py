from config.settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'geosurvey',
        'USER': 'postgres',
#        'HOST': 'localhost',
#        'PORT': '5432'
    }
}

CACHES = {
    'default': {
        'BACKEND': 'redis_cache.RedisCache',
        'LOCATION': 'localhost:6379',
        'OPTIONS': {
            'DB': 1,
            'PARSER_CLASS': 'redis.connection.HiredisParser'
        },
    },
}

DEBUG = True
TEMPLATE_DEBUG = DEBUG
ALLOWED_HOSTS = ['*']
# settings/local.py is ignored to allow for easy settings
# overrides without affecting others
try:
    from local import *
except ImportError:
    pass
