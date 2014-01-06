from social.backends.open_id import OpenIdAuth
from social.exceptions import AuthMissingParameter


class OSTOpenId(OpenIdAuth):
    """OST OpenID authentication backend"""
    name = 'ost'
    URL = 'http://oceanspaces.org/user'
    def get_user_details(self, response):
        """Return user details from OST account"""
        email = self.data.get('openid.sreg.email')
        return {'username': email,
                'email': email,
                'fullname': self.data.get('openid.sreg.nickname')}
