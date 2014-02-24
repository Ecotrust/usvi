from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie import fields, utils

from tastypie.authentication import SessionAuthentication, Authentication
from tastypie.authorization import DjangoAuthorization, Authorization
from django.contrib.auth.models import User
from account.models import UserProfile
from survey.api import StaffUserOnlyAuthorization

class UserProfileResource(ModelResource):
    class Meta:
        queryset = UserProfile.objects.all()
        resource_name = 'profile'

class UserResource(ModelResource):
    profile = fields.ToOneField(UserProfileResource, 'profile', readonly=True, full=True)


    class Meta:
        queryset = User.objects.all().order_by('username')
        excludes = ['password', 'is_superuser']
        filtering = {
            'username': ALL,
            'is_staff': ALL,
            'is_active': ALL
        }
        ordering = ['username']
        authentication = SessionAuthentication()
        authorization = DjangoAuthorization()
        always_return_data = True
