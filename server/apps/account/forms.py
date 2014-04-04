from django import forms
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.forms import SetPasswordForm

from account.models import UserProfile

class SignupForm(forms.Form):
    """
    Form for creating a new user account.

    Validates that the requested username and e-mail is not already in use.
    Also requires the password to be entered twice.

    """
    username = forms.CharField(error_messages={'invalid': _('Username must contain only numbers and be 4 digits long')})
    
    emailaddress1 = forms.EmailField()
    emailaddress2 = forms.EmailField()

    password = forms.CharField()
    

    def clean_username(self):
        """
        Validate that the username not already in use.
        
        """
        try:
            user = User.objects.get(username__iexact=self.cleaned_data['username'])
        except User.DoesNotExist:
            pass
        else:
            raise forms.ValidationError(_('This username is already taken.'))

        return self.cleaned_data['username']

    def clean_emailaddress1(self):
        """ Validate that the e-mail address is unique. """
        if User.objects.filter(email__iexact=self.cleaned_data['emailaddress1']):
            raise forms.ValidationError(_('This email is already in use. Please supply a different email.'))
        return self.cleaned_data['emailaddress1']

    def clean_password1(self):
        """
        Make sure passord is a 4 digit number. 
        """
        

        password = self.cleaned_data['password1']
        if not len(password) == 4: 
            raise forms.ValidationError(_('Password must be 4 digits long'))
        try:
            int(password)
        except ValueError:
            raise forms.ValidationError(_('Password can only contain numbers'))

        return password


    def save(self):
        """ Creates a new user and account. Returns the newly created user. """
        username, email, password = (self.cleaned_data['username'],
                                     self.cleaned_data['emailaddress1'],
                                     self.cleaned_data['password'])

        user = User(username=username, email=email)
        user.save()

        user.set_password(password)
        user.save()

        UserProfile.objects.get_or_create(user=user)

        return user



class DDSetPasswordForm(SetPasswordForm):
    """
    This form enforces 4-digit passwords for non-staff users (i.e. fishers)
    """

    def clean_new_password2(self):

        password2 = super(DDSetPasswordForm, self).clean_new_password2()
        if not self.user.is_staff:
            if not len(password2) == 4: 
                raise forms.ValidationError(_('Password must be 4 digits long'))
            try:
                int(password2)
            except ValueError:
                raise forms.ValidationError(_('Password can only contain numbers'))

        return password2




