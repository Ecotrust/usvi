from tastypie.test import ResourceTestCase
from django.contrib.auth.models import User
from ..api import SurveyResource
from ..models import Respondant, Response, Survey, Page
import json

class SurveyResourceTest(ResourceTestCase):
    # Use ``fixtures`` & ``urls`` as normal. See Django's ``TestCase``
    # documentation for the gory details.
    fixtures = ['surveys.json.gz']

    def setUp(self):
        super(SurveyResourceTest, self).setUp()

        # Create a user.
        self.username = 'fisher'
        self.password = 'secret'
        self.user = User.objects.create_user(self.username, 'fish@example.com', self.password)
        self.user.is_staff = True
        self.user.save()


    def test_get_survey(self):
        res = self.api_client.get('/api/v1/survey/catch-report/', format='json')
        self.assertValidJSONResponse(res)

        survey = self.deserialize(res)

        self.assertEqual(survey['slug'], 'catch-report')
    
    def get_credentials(self):
        result = self.api_client.client.login(username='fisher',
                                              password='secret')
        return result

    def test_order_pages(self):
        result = self.api_client.client.login(username='fisher', password='secret')
        original_data = self.deserialize(self.api_client.get('/api/v1/survey/catch-report/',
            format='json'))
        
        new_data = original_data.copy()
        
        #first page has an order of 2, need to switch it to 1
        self.assertEqual(original_data['pages'][1]['order'], 2)

        # first page has 3 questions
        self.assertEqual(len(original_data['pages'][1]['questions']), 3)
        new_data['pages'][1]['order'] = 1
        new_data['pages'][1]['questions'] = map(lambda x: x['resource_uri'],
            new_data['pages'][1]['questions'])

        res = self.api_client.put(original_data['pages'][1]['resource_uri'],
            format='json', data=new_data['pages'][1],
            authentication=self.get_credentials())

        # order has been updates and number of questions is the same
        self.assertHttpAccepted(res)
        self.assertEqual(Page.objects.get(pk=original_data['pages'][1]['id']).order,
            1)
        self.assertEqual(Page.objects.get(pk=original_data['pages'][1]['id']).questions.count(),
            3)
    

    def test_submit_report(self):
        report = {"ts":"2014-01-09T17:47:47.923Z","uuid":"offline_1389289667923","responses":[{"answer":"Edwin","question":"/api/v1/question/88/","answer_raw":"\"Edwin\""},{"answer":"Knuth","question":"/api/v1/question/89/","answer_raw":"\"Knuth\""},{"answer":"test","question":"/api/v1/question/151/","answer_raw":"\"test\""},{"answer":"test","question":"/api/v1/question/152/","answer_raw":"\"test\""},{"answer":"test","question":"/api/v1/question/153/","answer_raw":"\"test\""},{"answer":"2014-01-09","question":"/api/v1/question/6/","answer_raw":"\"2014-01-09\""},,{"answer":3,"question":"/api/v1/question/9/","answer_raw":"3"},{"answer":{"text":"No","label":"No","checked":True},"question":"/api/v1/question/74/","answer_raw":"{\"text\":\"No\",\"label\":\"No\",\"checked\":True}"},{"answer":[{"text":"Hook and Line or Rod and Reel","label":"hook-and-line-or-rod-and-reel","checked":True,"isGroupName":False}],"question":"/api/v1/question/11/","answer_raw":"[{\"text\":\"Hook and Line or Rod and Reel\",\"label\":\"hook-and-line-or-rod-and-reel\",\"checked\":True,\"isGroupName\":False}]"},{"answer":{"text":"Hand","label":"hand","checked":True,"isGroupName":False},"question":"/api/v1/question/12/","answer_raw":"{\"text\":\"Hand\",\"label\":\"hand\",\"checked\":True,\"isGroupName\":False}"},{"answer":3,"question":"/api/v1/question/13/","answer_raw":"3"},{"answer":3,"question":"/api/v1/question/14/","answer_raw":"3"},{"answer":"3","question":"/api/v1/question/15/","answer_raw":"\"3\""},{"answer":3,"question":"/api/v1/question/16/","answer_raw":"3"},{"answer":{"value":3,"unit":"Fathoms"},"question":"/api/v1/question/17/","answer_raw":"{\"value\":3,\"unit\":\"Fathoms\"}"},{"answer":["AP25","AP26"],"question":"/api/v1/question/154/","answer_raw":"[\"AP25\",\"AP26\"]"},{"answer":[{"text":"Groupers\r","label":"groupers","checked":True,"isGroupName":True},{"text":"Butterfish (Coney)\r","label":"butterfish-coney","checked":True,"isGroupName":False}],"question":"/api/v1/question/18/","answer_raw":"[{\"text\":\"Groupers\\r\",\"label\":\"groupers\",\"checked\":True,\"isGroupName\":True},{\"text\":\"Butterfish (Coney)\\r\",\"label\":\"butterfish-coney\",\"checked\":True,\"isGroupName\":False}]"},{"answer":[{"text":"","label":"","checked":True,"guttedpounds":None,"wholepounds":3},{"text":"Groupers\r","label":"groupers\r","checked":True,"guttedpounds":3,"wholepounds":3},{"text":"Butterfish (Coney)\r","label":"butterfish (coney)\r","checked":True,"guttedpounds":3,"wholepounds":3}],"question":"/api/v1/question/19/","answer_raw":"[{\"text\":\"\",\"label\":\"\",\"checked\":True,\"guttedpounds\":None,\"wholepounds\":3},{\"text\":\"Groupers\\r\",\"label\":\"groupers\\r\",\"checked\":True,\"guttedpounds\":3,\"wholepounds\":3},{\"text\":\"Butterfish (Coney)\\r\",\"label\":\"butterfish (coney)\\r\",\"checked\":True,\"guttedpounds\":3,\"wholepounds\":3}]"},{"answer":3,"question":"/api/v1/question/54/","answer_raw":"3"},{"answer":3,"question":"/api/v1/question/55/","answer_raw":"3"},{"answer":15,"question":"/api/v1/question/87/","answer_raw":"15"},{"answer":{"text":"No","label":"No","checked":True},"question":"/api/v1/question/78/","answer_raw":"{\"text\":\"No\",\"label\":\"No\",\"checked\":True}"},{"answer":{"text":"No","label":"No","checked":True},"question":"/api/v1/question/71/","answer_raw":"{\"text\":\"No\",\"label\":\"No\",\"checked\":True}"},{"answer":{"text":"No","label":"No","checked":True},"question":"/api/v1/question/72/","answer_raw":"{\"text\":\"No\",\"label\":\"No\",\"checked\":True}"},{"answer":{"text":"No","label":"No","checked":True},"question":"/api/v1/question/73/","answer_raw":"{\"text\":\"No\",\"label\":\"No\",\"checked\":True}"}],"status":"complete","complete":True,"survey":"/api/v1/survey/catch-report/"}
        res = self.api_client.post('/api/v1/offlinerespondant/', format="json", data=report, authentication=self.get_credentials())
        print res
        self.assertHttpAccepted(res)