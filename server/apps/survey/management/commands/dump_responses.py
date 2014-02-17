from django.core.management.base import BaseCommand
# from optparse import make_option
from survey.models import Respondant


class Command(BaseCommand):
    help = 'Copy Survey'

    def handle(self, *args, **options):
        for respondant in Respondant.objects.all():
            for r in respondant.response_set.all():
                print "%s\t%s\t%s\t%s" % (respondant.survey.slug, respondant.uuid, r.question.slug, r.answer_raw)
