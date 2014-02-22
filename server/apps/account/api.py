from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie import fields, utils

from tastypie.authentication import SessionAuthentication, Authentication
from tastypie.authorization import DjangoAuthorization, Authorization
from django.contrib.auth.models import User
from account.models import UserProfile
from survey.api import StaffUserOnlyAuthorization

class UserResource(ModelResource):


    class Meta:
        queryset = User.objects.all().order_by('username')
        excludes = ['email', 'password', 'is_superuser']
        filtering = {
            'username': ALL,
            'is_staff': ALL
        }
        ordering = ['username']
        authentication = SessionAuthentication()
        authorization = DjangoAuthorization()
        always_return_data = True
