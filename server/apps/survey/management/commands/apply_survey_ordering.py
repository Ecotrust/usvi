from django.core.management.base import BaseCommand, CommandError

from datetime import datetime

from survey.models import Respondant


class Command(BaseCommand):
    help = 'Assign ordering_date to all Respondants'

    def handle(self, *args, **options):
        for r in Respondant.objects.all():
            try:
                ldate = r.responses.get(question__slug='landed-date')
                odate = datetime.strptime(ldate.answer, '%Y-%m-%d')
                r.ordering_date = odate
                r.save()
                print 'success fully saved landed-date with %Y-%m-%d format'
            except:
                pass

            try:
                ldate = r.responses.get(question__slug='landed-date')
                odate = datetime.strptime(ldate.answer, '%Y/%m/%d')
                r.ordering_date = odate
                r.save()
                print 'success fully saved landed-date with %Y/%m/%d format'
            except:
                pass

            try:
                ldate = r.responses.get(question__slug='did-not-fish-for-month-of')
                odate = datetime.strptime(ldate.answer, '%m-%Y')
                r.ordering_date = odate
                r.save()
                print 'success fully saved did-not-fish-for-month-of with %m-%Y format'
            except:
                pass

            try:
                ldate = r.responses.get(question__slug='did-not-fish-for-month-of')
                odate = datetime.strptime(ldate.answer, '%m/%Y')
                r.ordering_date = odate
                r.save()
                print 'success fully saved did-not-fish-for-month-of with %m/%Y format'
            except:
                pass

