from django.conf.urls import *
from views import *

from account.forms import DDSetPasswordForm


urlpatterns = patterns('',
	url(r'^login', login, name="login"),
    (r'^authenticateUser', authenticateUser),
	(r'^createUser', createUser),
	(r'^updateUser', updateUser),
	(r'^updatePassword', updatePassword),
	(r'^sendFeedback', sendFeedback),
	(r'^forgotPassword', forgotPassword),
    (r'^password_reset/$', 'django.contrib.auth.views.password_reset', {'post_reset_redirect' : '/accounts/login?next=/fisher'}),
    (r'^password_reset_done/$', 'django.contrib.auth.views.password_reset_complete'),
    # This needs to do double duty
    (r'^password_reset_confirm/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$', 'django.contrib.auth.views.password_reset_confirm', 
        {"set_password_form":DDSetPasswordForm}),

)