from django.contrib import admin
from account.models import *

from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

# class YourUserAdmin(UserAdmin):
#     actions = list(UserAdmin.actions) + ['send_reset_password']

#     def send_reset_password(request, email):
#         form = PasswordResetForm({'email': email})
#         form.full_clean()
#         form.save({
#             'token_generator': default_token_generator,
#             'from_email': 'edwin@pointnineseven.com',
#             'email_template_name': 'registration/password_reset_email.html',
#             'request': request
#         })

# admin.site.unregister(User)
# admin.site.register(User, YourUserAdmin)



def set_password_1234(modeladmin, request, queryset):
    """
    Resets password on selected account to "1234".
    """
    for profile in queryset:
        profile.user.set_password("1234")
        profile.user.save()

set_password_1234.short_description = 'Reset passwords on selected accounts to "1234"'


class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'email']
    actions = [set_password_1234]



class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('__unicode__', 'message', 'ts')


admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(Feedback, FeedbackAdmin)
