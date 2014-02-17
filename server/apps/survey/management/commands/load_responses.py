from django.core.management.base import BaseCommand
# from optparse import make_option
from survey.models import Respondant, Response, Survey, Question


class Command(BaseCommand):
    help = 'Load Survey Responses'

    def handle(self, *args, **options):
        import csv
        with open('../responses.csv', 'rb') as csvfile:
            reader = csv.reader(csvfile, delimiter='\t')
            for row in reader:

                try:
                    survey = Survey.objects.get(slug=row[0])
                    respondant = Respondant.objects.get(uuid=row[1])
                    question = Question.objects.get(slug=row[2], question_page__survey=survey)
                except:
                    continue
                try:
                    r, created = Response.objects.get_or_create(respondant=respondant, question=question, answer_raw=row[3])
                    respondant.responses.clear()
                    respondant.response_set.clear()
                    respondant.responses.add(r)
                    respondant.response_set.add(r)
                    respondant.save()
                    print respondant.uuid
                    if created:
                        print row
                except:
                    pass
        # for respondant in Respondant.objects.all():
        #     for r in respondant.response_set.all():
        #         print "%s\t%s\t%s\t%s" % (respondant.survey.slug, respondant.uuid, r.question.slug, r.answer_raw)
