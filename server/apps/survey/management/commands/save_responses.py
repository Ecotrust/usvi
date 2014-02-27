from django.core.management.base import BaseCommand
# from optparse import make_option
from survey.models import Response, Respondant


class Command(BaseCommand):
    help = 'Save All Responses'
    # option_list = BaseCommand.option_list + (
    #     make_option('-W', '--white-space',
    #         action='store_true',
    #         default=False,
    #         help='Get responses with funky white space.'),
    #     make_option('-I', '--question_id',
    #         action='store',
    #         default=False,
    #         help='Get responses for a specific quesiton.'),
    # )

    def handle(self, *args, **options):
        #for response in Response.objects.all():
        responses = Response.objects.all()
        print "Saving Answers for %s Responses" % responses.count()
        for respondent in Respondant.objects.all():
            print respondent.response_set.count()
            if respondent.response_set.count():
                for response in respondent.response_set.all():
                    print response.id
                    response.save_related()
            else:
                respondent.save()
