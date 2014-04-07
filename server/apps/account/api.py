from tastypie.resources import ModelResource, ALL
from tastypie import fields

from tastypie.authentication import (SessionAuthentication,
                                     ApiKeyAuthentication,
                                     MultiAuthentication)
from tastypie.authorization import DjangoAuthorization
from django.contrib.auth.models import User
from account.models import UserProfile


class UserProfileResource(ModelResource):
    class Meta:
        queryset = UserProfile.objects.all()
        authorization = DjangoAuthorization()
        authentication = MultiAuthentication(ApiKeyAuthentication(),
                                             SessionAuthentication())
        resource_name = 'profile'


class UserResource(ModelResource):
    profile = fields.ToOneField(UserProfileResource, 'profile',
                                readonly=True, full=True)

    class Meta:
        queryset = User.objects.all().order_by('username')
        excludes = ['password', 'is_superuser']
        filtering = {
            'username': ALL,
            'is_staff': ALL,
            'is_active': ALL
        }
        ordering = ['username']
        authorization = DjangoAuthorization()
        authentication = MultiAuthentication(ApiKeyAuthentication(),
                                             SessionAuthentication())
        always_return_data = True
