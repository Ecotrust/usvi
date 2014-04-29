from django.core.management.base import BaseCommand
from optparse import make_option
from survey.models import Respondant, Response
import traceback
  

class Command(BaseCommand):
    help = 'Save All Responses'

    def handle(self, *args, **options):
        responses = Response.objects.all()
        respondents = Respondant.objects.all()
        numRespondents = respondents.count()
        numRespondentsFailed = 0
        numResponsesFailed = 0
        respondentIndex = 0
        
        print "Saving Answers for %s Responses" % responses.count()
        for respondent in respondents:
            respondentIndex += 1
            print "Saving for respondent " + str(respondentIndex) + " of " + str(numRespondents) + " who has " + str(respondent.response_set.count()) + " responses."
            if respondent.response_set.count():
                for response in respondent.response_set.all():
                    try:
                        response.save_related()
                    except Exception as e:
                        numResponsesFailed += 1
                        print "Error for response " + str(response.id)
                        print e
                        pass
    
            try:        
                respondent.save()
            except Exception as e:
                numRespondentsFailed += 1
                print 'EXCEPTION, respondent is:' + respondent.uuid
                print traceback.format_exc()
                pass

        print 'Done'
        print str(numRespondentsFailed) + ' Respondents failed to save()'
        print str(numResponsesFailed) + ' Responses failed to save_related()'

