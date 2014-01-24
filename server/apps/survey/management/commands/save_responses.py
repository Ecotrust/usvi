from django.core.management.base import BaseCommand, CommandError

from survey.models import Response, Question


class Command(BaseCommand):
    help = 'Save All Responses'

    def handle(self, *args, **options):
        for response in Response.objects.filter(question__slug__icontains='weight'):
        	response.save_related()
