
import simplejson
import datetime

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login
from django.contrib.auth.views import login as login_view
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordResetForm
from django.db import IntegrityError
from django.conf import settings
from django.core.validators import email_re
from django.core.exceptions import MultipleObjectsReturned


from tastypie.models import ApiKey

from account.models import UserProfile, Feedback
from account.forms import SignupForm



@csrf_exempt
def authenticateUser(request):

    param = simplejson.loads(request.body)
    print param
    # user = User.objects.get(username=param.get('username', None))
    user = authenticate(username=param.get(
        'username', None), password=param.get('password')) 
    try:
        login(request, user)
    except:
        return HttpResponse("auth-error", status=500)

    if user:
        profile = user.profile
        user_dict = {
            'username': user.username,
            'name': ' '.join([user.first_name, user.last_name]),
            'email': user.email,
            'is_staff': user.is_staff,
            'registration': user.profile.registration,
            'tags': [tag.name for tag in profile.tags.all()],
            'api_key': user.api_key.key
        }
        return HttpResponse(simplejson.dumps({
            'success': True, 'user': user_dict
        }))
    else:
        return HttpResponse(simplejson.dumps({'success': False}))

def login(request):
    import pdb; pdb.set_trace()
    return login_view(request)




@csrf_exempt
def createUser(request):
    """
    Creates a new user and a profile

    Params:
    - emailaddress1
    - emailaddress2
    - username
    - password1
    - password2
    - dash
    - type

    Returns a user_dict on success, 500 with message on error.
    """
    
    param = simplejson.loads(request.body)
    dash = param.get('dash', False)
    user_type = param.get('type', 'fishers')

    form = SignupForm(param)

    if form.is_valid():
        user = form.save()
        if user_type in ['staff', 'intern'] and dash_can_create:
            user.is_staff = True
            user.save()

        user.profile.registration = '{}'
        user.profile.tags.add('usvi')
        if user_type in ['intern'] and dash_can_create:
            user.profile.is_intern = True
        user.profile.save()


        if dash is False:
            user = authenticate(username=user.username, password=param.get('password'))
            login(request, user)
        api_key, created = ApiKey.objects.get_or_create(user=user)
        api_key.key = api_key.generate_key()
        api_key.save()
        
        user_dict = {
            'username': user.username,
            'name': ' '.join([user.first_name, user.last_name]),
            'email': user.email,
            'is_staff': user.is_staff,
            'registration': user.profile.registration,
            'is_intern': user.profile.is_intern,
            'api_key': user.api_key.key
        }
        return HttpResponse(simplejson.dumps({'success': True, 'user': user_dict}))
    else:
        # Something is went wrong
        if 'username' in form.errors:
            return HttpResponse("duplicate-user", status=500)
        
        if 'emailaddress1' in form.errors:
            return HttpResponse("invalid-email", status=500)
        
        if 'emailaddress1' in form.errors:
            return HttpResponse("duplicate-email", status=500)
        if 'password1' in form.errors:
            return HttpResponse("invalid-password", status=500)
        else:
            return HttpResponse("unknown-error", status=500)


@csrf_exempt
def forgotPassword(request):
    if request.method == 'POST':
        param = simplejson.loads(request.body)
        email = param.get('email', None)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return HttpResponse("user-not-found", status=401)  
        except MultipleObjectsReturned:
            return HttpResponse("multiple-users-found", status=500)  
        print email
        form = PasswordResetForm({'email': email})
        setattr(form, 'users_cache', [user])
        form.save(from_email=settings.SERVER_ADMIN,
            email_template_name='registration/password_reset_email.html')
        return HttpResponse(simplejson.dumps({'success': True}))
    else:
        return HttpResponse("error", status=500)


@csrf_exempt
def sendFeedback(request):
    if request.POST:
        param = simplejson.loads(request.POST.keys()[0])
        feedback_message = param.get('feedback', None)
        data = param.get('data', None)
        feedback = Feedback(message=feedback_message, ts=datetime.datetime.now(), data=data)
        if request.user.is_authenticated():
            feedback.user = request.user
        else:
            feedback.message = "%s\n%s" %(feedback.message, param.get('username', None))
        feedback.save()
    return HttpResponse(simplejson.dumps({'success': True }))

@csrf_exempt
def updateUser(request):
    if request.method == "POST":
        param = simplejson.loads(request.body)
        user = get_object_or_404( User, username=param.get('username', None) )

        if request.user.username != user.username:
            return HttpResponse("You cannot access another user's profile.", status=401)
        else:
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.registration = simplejson.dumps(param.get('registration'))
            profile.tags.clear()
            for tag in param.get('tags', []):
                profile.tags.add(tag)
            profile.save()
            user.email = param.get('email', None)
            user.save()
            user_dict = {
                'username': user.username,
                'name': ' '.join([user.first_name, user.last_name]),
                'is_staff': user.is_staff,
                'registration': user.profile.registration,
                'email': user.email
            }
            return HttpResponse(simplejson.dumps({'success': True, 'user': user_dict}))
    else:
        return HttpResponse("error", status=500)


@csrf_exempt
def updatePassword(request):
    if request.method == "POST":
        param = simplejson.loads(request.body)
        user = get_object_or_404( User, username=param.get('username', None) )
        if request.user.username != user.username:
            return HttpResponse("You are not logged in as that user.", status=401)
        else:
            passwords = param.get('passwords', None)
            if passwords:
                password_old = passwords.get('old') 
                password_new1 = passwords.get('new1')
                password_new2 = passwords.get('new2')
                if password_new1 == password_new2:
                    auth_user = authenticate(username=user.username, password=password_old)
                    if auth_user is not None:
                        user.set_password(password_new1)
                        user.save()
                        return HttpResponse(simplejson.dumps({'success': True}))
                    return HttpResponse("Old password is incorrect.", status=401)
                return HttpResponse("Passwords do not match.", status=401)
    return HttpResponse("error", status=500)
