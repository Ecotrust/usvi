from social.backends.open_id import OpenIdAuth
from social.exceptions import AuthMissingParameter


class OSTOpenId(OpenIdAuth):
    """OST OpenID authentication backend"""
    name = 'ost'
    URL = 'http://oceanspaces.org/user'
    def get_user_details(self, response):
        """Return user details from OST account"""
        print response
        email = response.get('email', '')
        return {'username': email.split('@', 1)[0],
                'email': email,
                'fullname': response.get('name', ''),
                'first_name': response.get('given_name', ''),
                'last_name': response.get('family_name', '')}
