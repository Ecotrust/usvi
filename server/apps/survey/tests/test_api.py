from tastypie.test import ResourceTestCase

from django.contrib.auth.models import User
from ..api import SurveyResource
from ..models import Respondant, Response, Survey, Page, Response
import json
import datetime
from tastypie.models import ApiKey

class SurveyResourceTest(ResourceTestCase):
    # Use ``fixtures`` & ``urls`` as normal. See Django's ``TestCase``
    # documentation for the gory details.
    fixtures = ['surveys.json.gz']

    def setUp(self):
        super(SurveyResourceTest, self).setUp()

        # Create a staff user.
        self.username = 'staff_user'
        self.password = 'secret'
        self.user = User.objects.create_user(self.username, 'fish@example.com', self.password)
        self.user.is_staff = True
        self.user.profile.tags.add('usvi')
        self.user.save()
        api_key, created = ApiKey.objects.get_or_create(user=self.user)
        api_key.key = api_key.generate_key()
        api_key.save()

        # Create fisher
        self.fishername = "fisher_user"
        self.password = 'secret'
        self.fisher_user = User.objects.create_user(self.fishername, 'fish2@example.com', self.password)
        self.fisher_user.is_staff = False
        self.fisher_user.profile.tags.add('usvi')
        self.fisher_user.save()
        api_key, created = ApiKey.objects.get_or_create(user=self.fisher_user)
        api_key.key = api_key.generate_key()
        api_key.save()


    def test_get_survey(self):
        res = self.api_client.get('/api/v1/survey/catch-report/', format='json')
        self.assertValidJSONResponse(res)

        survey = self.deserialize(res)

        self.assertEqual(survey['slug'], 'catch-report')

    def get_credentials(self, username="staff_user"):
        result = self.api_client.client.login(username=username,
                                              password='secret')
        return result

    def test_patch_response(self):
        
        print "Patching as a staff user"
        survey = Survey.objects.get(slug='catch-report')
        question = survey.questions.get(slug='island')
        respondant = Respondant(survey=survey,
                                ts=datetime.datetime.now(),
                                user=self.user)
        response = Response(question=question,
                            respondant=respondant,
                            answer_raw=json.dumps({'text': 'St. John'}))
        respondant.save()
        response.save()
        url = '/api/v1/response/{0}/?username={1}&api_key={2}'.format(response.id, self.user.username, self.user.api_key)
        self.assertEqual(response.question, question)
        self.assertEqual(respondant.user, self.user)
        data = {
            "answer_raw": {'text': 'St. Thomas'}
        }
        res = self.api_client.patch(url, 
            format='json', data=data, authentication=self.get_credentials())
        self.assertHttpAccepted(res)

        print "Patching as a fisher user"
        survey = Survey.objects.get(slug='catch-report')
        question = survey.questions.get(slug='island')
        respondant = Respondant(survey=survey,
                                ts=datetime.datetime.now(),
                                user=self.user)
        response = Response(question=question,
                            respondant=respondant,
                            answer_raw=json.dumps({'text': 'St. John'}))
        respondant.save()
        response.save()
        url = '/api/v1/response/{0}/?username={1}&api_key={2}'.format(response.id, self.fisher_user.username, self.fisher_user.api_key)
        self.assertEqual(response.question, question)
        self.assertEqual(respondant.user, self.user)
        data = {
            "answer_raw": {'text': 'St. Thomas'}
        }
        creds = self.get_credentials(username="fisher_user")
        import pdb; pdb.set_trace()
        res = self.api_client.patch(url, 
            format='json', data=data, 
            authentication=creds)
        self.assertHttpAccepted(res)



    # def test_order_pages(self):
    #     result = self.api_client.client.login(username='fisher', password='secret')
    #     original_data = self.deserialize(self.api_client.get('/api/v1/survey/catch-report/',
    #         format='json'))
    #     new_data = original_data.copy()

    #     #first page has an order of 2, need to switch it to 1
    #     self.assertEqual(original_data['pages'][1]['order'], 2)

    #     # first page has 3 questions
    #     self.assertEqual(len(original_data['pages'][1]['questions']), 3)
    #     new_data['pages'][1]['order'] = 1
    #     new_data['pages'][1]['questions'] = map(lambda x: x['resource_uri'],
    #         new_data['pages'][1]['questions'])

    #     res = self.api_client.put(original_data['pages'][1]['resource_uri'],
    #         format='json', data=new_data['pages'][1],
    #         authentication=self.get_credentials())

    #     # order has been updates and number of questions is the same
    #     self.assertHttpAccepted(res)
    #     self.assertEqual(Page.objects.get(pk=original_data['pages'][1]['id']).order,
    #         1)
    #     self.assertEqual(Page.objects.get(pk=original_data['pages'][1]['id']).questions.count(),
    #         3)

