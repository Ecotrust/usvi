from django.core.management.base import BaseCommand, CommandError

from survey.models import Question


class Command(BaseCommand):
    help = 'Save All Question'

    def handle(self, *args, **options):
        for question in Question.objects.all():
            question.save()
