from django.core.management.base import BaseCommand
# from optparse import make_option
from survey.models import Survey, Page, Block, Question


class Command(BaseCommand):
    help = 'Copy Survey'

    def handle(self, *args, **options):
        base_slug = args[0]
        dest_slug = "{0}-{1}".format(base_slug, args[1])
        dest_base = args[1]
        base_survey = Survey.objects.get(slug=base_slug)

        print 'Copying from "{0} ({1})" to "{2} ({3})"'.format(base_survey.name,
            base_survey.slug, base_survey.name, dest_slug)

        dest_survey, created = Survey.objects.get_or_create(slug=dest_slug)
        if created:
            print "New Destination"
        for page in base_survey.page_set.all():
            new_page, created = Page.objects.get_or_create(survey=dest_survey, order=page.order)
            if created:
                print "Creating page", page.order
            else:
                print "Already created page", page.order
            new_page.blocks.clear()
            for block in page.blocks.all():
                new_block, created = Block.objects.get_or_create(name="%s (%s)" % (block.name, dest_slug),
                    skip_condition=block.skip_condition)
                if created:
                    print "Creating block", block.name
                else:
                    print "Already created block", block.name
                try:
                    new_skip_question = Question.objects.get(slug="%s-%s" % (block.skip_question.slug, dest_base))
                    new_block.skip_question = new_skip_question
                    print "creating ", new_skip_question.slug
                except:
                    block.skip_question.id = None
                    block.skip_question.slug = "%s-%s" % (block.skip_question.slug, dest_base)
                    block.skip_question.save()
                    new_block.skip_question = block.skip_question
                new_page.blocks.add(new_block)
            for question in page.questions.all():
                try:
                    new_question = Question.objects.get(slug="%s-%s" % (question.slug, dest_base))
                    new_page.questions.add(new_question)
                except:
                    question.id = None
                    question.slug = "%s-%s" % (question.slug, dest_base)
                    question.save()
                    new_page.questions.add(question)
            new_page.save()
