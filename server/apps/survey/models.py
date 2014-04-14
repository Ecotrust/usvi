from django.db import models
from django.db.models import Max, Min, Count, Sum
from django.contrib.auth.models import User
from django.db.models import signals
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError

from taggit.managers import TaggableManager

from account.models import UserProfile
from acl.models import Dialect, DialectSpecies, Species, SpeciesFamily
from places.models import Area
import dateutil.parser
import uuid
import simplejson
import caching.base
import re
import json
import dateutil.parser
import datetime

# Get an instance of a logger
import logging

# Get an instance of a logger
logger = logging.getLogger(__name__)

def make_uuid():
    return str(uuid.uuid4())

STATE_CHOICES = (
    ('complete', 'Complete'),
    ('terminate', 'Terminate'),

)

REVIEW_STATE_NEEDED = u'needs review'
REVIEW_STATE_FLAGGED = u'flagged'
REVIEW_STATE_ACCEPTED = u'accepted'

REVIEW_STATE_CHOICES = (
    (REVIEW_STATE_NEEDED, u'Needs Review'),
    (REVIEW_STATE_FLAGGED, u'Flagged'),
    (REVIEW_STATE_ACCEPTED, u'Accepted')
)

class TaggedManager(caching.base.CachingManager):
    def for_user(self, user):
        return super(TaggedManager, self).get_query_set().filter(creator=user)

class Respondant(caching.base.CachingMixin, models.Model):
    uuid = models.CharField(max_length=36, primary_key=True, default=make_uuid, editable=False)
    survey = models.ForeignKey('Survey')
    complete = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATE_CHOICES, default=None, null=True, blank=True)
    review_status = models.CharField(max_length=20, choices=REVIEW_STATE_CHOICES, default=REVIEW_STATE_NEEDED)
    comment = models.TextField(null=True, blank=True)
    notify = models.BooleanField(default=False)
    last_question = models.CharField(max_length=240, null=True, blank=True)

    island = models.CharField(max_length=240, null=True, blank=True)
    locations = models.IntegerField(null=True, blank=True)

    ts = models.DateTimeField(auto_now_add=True)
    email = models.EmailField(max_length=254, null=True, blank=True, default=None)
    ordering_date = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    user = models.ForeignKey(User, null=True, blank=True)
    entered_by = models.ForeignKey(User, null=True, blank=True, related_name='entered_by')
    updated_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    objects = caching.base.CachingManager()

    def save(self, *args, **kwargs):
        if self.uuid and ":" in self.uuid:
            self.uuid = self.uuid.replace(":", "_")
        if self.ordering_date is None:
            self.ordering_date = self.ts
        if self.survey.slug.find('puerto-rico') != -1:
            self.island = "Puerto Rico"
        self.updated_at = datetime.datetime.now()
        super(Respondant, self).save(*args, **kwargs)

    @property
    def profile_values(self):
        answers = self.response_set.filter(question__attach_to_profile=True).values('answer')
        return [a['answer'] for a in answers]

    @property
    def species_values(self):
        answers = self.response_set.filter(question__use_species_list=True).values('answer')
        species_list = []
        for answer in answers:
            for species in answer['answer'].split(','):
                species_list.append(species)
        return species_list

    @property
    def answers_list(self):
        answers = self.response_set.all().values('answer')
        return [a['answer'] for a in answers]
    
    @property
    def survey_title(self):
        return self.survey.name

    @property
    def survey_slug(self):
        return self.survey.slug

    def __unicode__(self):
        if self.email:
            return "%s" % self.email
        else:
            return "%s" % self.uuid


class Page(caching.base.CachingMixin, models.Model):
    question = models.ForeignKey('Question', null=True, blank=True)
    questions = models.ManyToManyField('Question', null=True, blank=True, related_name="question_page")
    survey = models.ForeignKey('Survey', null=True, blank=True)
    blocks = models.ManyToManyField('Block', null=True, blank=True)
    order = models.IntegerField(default=1)
    objects = caching.base.CachingManager()

    @property
    def block_name(self):
        if self.blocks.all():
            return ", ".join([block.name for block in self.blocks.all()])
        else:
            return None

    class Meta:
        ordering = ['order']

    def __unicode__(self):
        question_names = ', '.join([question.slug for question in self.questions.all()])
        return "%s (%s)" % (self.survey, question_names)


class Survey(caching.base.CachingMixin, models.Model):
    name = models.CharField(max_length=254)
    slug = models.SlugField(max_length=254, unique=True)
    questions = models.ManyToManyField('Question', null=True, blank=True, through="Page")
    states = models.CharField(max_length=200, null=True, blank=True)
    anon = models.BooleanField(default=True)
    offline = models.BooleanField(default=False)

    tags = TaggableManager()
    objects = caching.base.CachingManager()


    @property
    def reviews_needed(self):
        return self.respondant_set.filter(review_status=REVIEW_STATE_NEEDED).count()

    @property
    def flagged(self):
        return self.respondant_set.filter(review_status=REVIEW_STATE_FLAGGED).count()


    @property
    def survey_responses(self):
        return self.respondant_set.all().count()

    @property
    def completes(self):
        return self.respondant_set.filter(complete=True).count()

    @property
    def activity_points(self):
        return Location.objects.filter(response__respondant__in=self.respondant_set.filter(complete=True)).count()

    @property
    def response_date_start(self):
        #return self.questions.filter(slug='survey-date').aggregate(date=Min('response__answer_date')).get('date', None)
        return self.respondant_set.all().aggregate(lowest=Min('ordering_date'), highest=Max('ordering_date'))['lowest']

    @property
    def response_date_end(self):
        #return self.questions.filter(slug='survey-date').aggregate(date=Max('response__answer_date')).get('date', None)
        return self.respondant_set.all().aggregate(lowest=Min('ordering_date'), highest=Max('ordering_date'))['highest']

    def __unicode__(self):
        return "%s" % self.name


QUESTION_TYPE_CHOICES = (
    ('info', 'Info Page'),
    ('datepicker', 'Date Picker'),
    ('monthpicker', 'Month Picker'),
    ('timepicker', 'Time Picker'),
    ('grid', 'Grid'),
    ('currency', 'Currency'),
    ('pennies', 'Pennies'),
    ('text', 'Text'),
    ('textarea', 'Text Area'),
    ('single-select', 'Single Select'),
    ('multi-select', 'Multi Select'),
    ('location', 'Location'),
    ('integer', 'Integer'),
    ('number', 'Number'),
    ('auto-single-select', 'Single Select with Autocomplete'),
    ('map-multipoint', 'Map with Multiple Points'),
    ('map-multipolygon', 'Map with Multiple Polygons'),
    ('yes-no', 'Yes/No'),
    ('number-with-unit', 'Number with Unit'),
)


class Option(caching.base.CachingMixin, models.Model):
    text = models.CharField(max_length=254)
    label = models.SlugField(max_length=64)
    type = models.CharField(max_length=20,
        choices=QUESTION_TYPE_CHOICES, default='integer')
    rows = models.TextField(null=True, blank=True)
    required = models.BooleanField(default=True)
    either_or = models.SlugField(max_length=64, null=True, blank=True)
    order = models.IntegerField(null=True, blank=True)
    min = models.IntegerField(default=None, null=True, blank=True)
    max = models.IntegerField(default=None, null=True, blank=True)

    objects = caching.base.CachingManager()

    def __unicode__(self):
        return "%s" % self.text

REPORT_TYPE_CHOICES = (
        ('distribution', 'Distribution'),
        ('heatmap', 'Heatmap'),
        ('heatmap-distribution', 'Heatmap & Distribution'),
    )


class Block(caching.base.CachingMixin, models.Model):
    name = models.CharField(max_length=254, null=True, blank=True)
    skip_question = models.ForeignKey('Question', null=True, blank=True)
    skip_condition = models.CharField(max_length=254, null=True, blank=True)

    def __unicode__(self):
        return "%s" % self.name


class Question(caching.base.CachingMixin, models.Model):
    title = models.TextField()
    label = models.CharField(max_length=254)
    order = models.IntegerField(default=0)
    slug = models.SlugField(max_length=64)
    attach_to_profile = models.BooleanField(default=False)
    persistent = models.BooleanField(default=False)
    type = models.CharField(max_length=20,choices=QUESTION_TYPE_CHOICES,default='text')
    options = models.ManyToManyField(Option, null=True, blank=True)
    options_json = models.TextField(null=True, blank=True)
    rows = models.TextField(null=True, blank=True)
    cols = models.TextField(null=True, blank=True)
    info = models.CharField(max_length=254, null=True, blank=True)
    grid_cols = models.ManyToManyField(Option, null=True, blank=True, related_name="grid_cols")

    geojson = models.TextField(null=True, blank=True)

    zoom = models.IntegerField(null=True, blank=True)
    min_zoom = models.IntegerField(null=True, blank=True, default=10)
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    integer_min = models.IntegerField(default=None, null=True, blank=True)
    integer_max = models.IntegerField(default=None, null=True, blank=True)
    term_condition = models.CharField(max_length=254, null=True, blank=True)
    skip_question = models.ForeignKey('self', null=True, blank=True)
    skip_condition = models.CharField(max_length=254, null=True, blank=True)

    blocks = models.ManyToManyField('Block', null=True, blank=True)    

    randomize_groups = models.BooleanField(default=False)

    options_from_previous_answer = models.CharField(max_length=254, null=True, blank=True)
    allow_other = models.BooleanField(default=False)
    required = models.BooleanField(default=True)
    modalQuestion = models.ForeignKey('self', null=True, blank=True, related_name="modal_question")
    hoist_answers = models.ForeignKey('self', null=True, blank=True, related_name="hoisted")
    foreach_question = models.ForeignKey('self', null=True, blank=True, related_name="foreach")
    pre_calculated = models.TextField(null=True, blank=True)

    # noaa mapping, question validates against species list
    use_species_list = models.BooleanField(default=False)

    # backend stuff
    filterBy = models.BooleanField(default=False)
    visualize = models.BooleanField(default=False)
    report_type = models.CharField(max_length=20,choices=REPORT_TYPE_CHOICES,null=True, default=None)
    filter_questions = models.ManyToManyField('self', null=True, blank=True)

    tags = TaggableManager()


    @property
    def answer_domain(self):
        if self.visualize or self.filterBy:
            answers = self.response_set.filter(respondant__complete=True)
            if self.type in ['map-multipoint']:
                return LocationAnswer.objects.filter(location__response__in=answers).values('answer').annotate(locations=Count('answer'), surveys=Count('location__respondant', distinct=True))
            else:
                return answers.values('answer').annotate(locations=Sum('respondant__locations'), surveys=Count('answer'))
        else:
            return None
        

    objects = caching.base.CachingManager()

    class Meta:
        ordering = ['order']

    @property
    def survey_slug(self):
        if self.question_page.all() and self.question_page.all()[0].survey:
            return self.question_page.all()[0].survey.slug
        if self.survey_set.all():
            return self.survey_set.all()[0].slug
        elif self.modal_question.all():
            return self.modal_question.all()[0].survey_set.all()[0].slug + " (modal)"
        else:
            return "NA"


    @property
    def question_types(self):
        return QUESTION_TYPE_CHOICES

    @property
    def report_types(self):
        return REPORT_TYPE_CHOICES

    def __unicode__(self):
        return "%s/%s/%s" % (self.survey_slug, self.slug, self.type)

    def clean(self, *args, **kwargs):
        if self.use_species_list:
            group = None
            regex = re.compile('\((.*)\)')
            updated_rows = []
            for row in self.rows.split('\n'):
                row = row.strip()
                if row.startswith("*"):
                    group = row[1:].strip()
                    updated_rows.append(row)
                    continue
                row = row.split('|')[0].strip()
                #match exact matches
                print row, group
                species = DialectSpecies.lookup(row, group)
                updated_rows.append("%s|%s (%s)" % (row, species.name, species.code))

            self.rows = ('\n').join(updated_rows)
        super(Question, self).clean(*args, **kwargs)

    def full_clean(self, *args, **kwargs):
        return self.clean(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.full_clean()
        super(Question, self).save(*args, **kwargs)




class LocationAnswer(caching.base.CachingMixin, models.Model):
    answer = models.TextField(null=True, blank=True, default=None)
    label = models.TextField(null=True, blank=True, default=None)
    location = models.ForeignKey('Location')

    def __unicode__(self):
        return "%s/%s" % (self.location.response.respondant.uuid, self.answer)


class Location(caching.base.CachingMixin, models.Model):
    response = models.ForeignKey('Response')
    respondant = models.ForeignKey('Respondant', null=True, blank=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7)
    lng = models.DecimalField(max_digits=10, decimal_places=7)

    def __unicode__(self):
        return "%s/%s/%s" % (self.response.respondant.survey.slug, self.response.question.slug, self.response.respondant.uuid)

class MultiAnswer(caching.base.CachingMixin, models.Model):
    response = models.ForeignKey('Response')
    answer_text = models.TextField()
    answer_label = models.TextField(null=True, blank=True)
    species = models.ForeignKey('acl.Species', null=True, blank=True)
    area = models.ForeignKey('places.Area', null=True, blank=True)

    def __unicode__(self):
        return self.answer_text

class GridAnswer(caching.base.CachingMixin, models.Model):
    response = models.ForeignKey('Response')
    row_text = models.TextField(null=True, blank=True)
    row_label = models.TextField(null=True, blank=True)
    col_text = models.TextField(null=True, blank=True)
    col_label = models.TextField(null=True, blank=True)
    answer_text = models.TextField(null=True, blank=True)
    answer_number = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    species = models.ForeignKey(Species, null=True, blank=True)

    def __unicode__(self):
        return "%s: %s" % (self.row_text, self.col_text)


class Response(caching.base.CachingMixin, models.Model):
    question = models.ForeignKey(Question)
    respondant = models.ForeignKey(Respondant, null=True, blank=True)
    answer = models.TextField(null=True, blank=True)
    answer_raw = models.TextField(null=True, blank=True)
    unit = models.TextField(null=True, blank=True)
    ts = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, null=True, blank=True)
    species = models.ForeignKey(Species, null=True, blank=True)
    objects = caching.base.CachingManager()

    def __unicode__(self):
        if self.respondant and self.question:
            return "%s/%s (%s)" %(self.respondant.survey.slug, self.question.slug, self.respondant.uuid)
        else:
            return "No Respondant"

    class Meta:
        ordering = ['-ts']

    def save_related(self):
        logger.debug('starting save related for {0}'.format(self))
        species = None
        if self.answer_raw:
            self.answer = simplejson.loads(self.answer_raw)
            if self.question.type in ['auto-single-select', 'single-select', 'yes-no']:
                answer = simplejson.loads(self.answer_raw)
                if answer.get('text'):
                    self.answer = answer['text'].strip()
                if answer.get('name'):
                    self.answer = answer['name'].strip()
            if self.question.type in ['monthpicker']:
                try:
                    date = dateutil.parser.parse(self.answer)
                    self.answer= "%s/%s" % (date.month, date.year)
                except Exception as e:
                    self.answer = self.answer_raw
            if self.question.type in ['number-with-unit']:
                try: 
                    answer = simplejson.loads(self.answer_raw)
                    self.answer = answer.get('value', answer)
                    self.unit = answer.get('unit', 'Unknown')
                except Exception as e:
                    self.answer = self.answer_raw
            if self.question.type in ['auto-multi-select', 'multi-select']:
                answers = []
                self.multianswer_set.all().delete()
                answer_list = simplejson.loads(self.answer_raw)
                if type(answer_list) is dict:
                    answer_list = [answer_list]
                for answer in answer_list:
                    if answer.get('text'):
                        answer_text = answer['text'].strip()
                    if answer.get('name'):
                        answer_text = answer['name'].strip()
                    answers.append(answer_text)
                    answer_label = answer.get('label', None)
                    if self.question.use_species_list:
                        code = answer.get('code', None)
                        if code is not None:
                            code_match = re.search(r'\((.*)\)', code)
                            if code_match is not None:
                                species = Species.objects.get(code=code_match.group(1))
                            else:
                                species = None
                        else:
                            try:
                                species = DialectSpecies.lookup(answer_text, None)
                            except:
                                species = None
                    else:
                        species = None
                    multi_answer = MultiAnswer(response=self, answer_text=answer_text, answer_label=answer_label, species=species)
                    multi_answer.save()
                    
                self.answer = ", ".join(answers)
            if self.question.type in ['map-multipolygon']:
                answers = []
                self.multianswer_set.all().delete()
                for answer in simplejson.loads(self.answer_raw):
                    answers.append(answer)
                    answer_label = None
                    multi_answer = MultiAnswer(response=self, answer_text=answer, answer_label=answer_label)
                    try:
                        area = Area.objects.get(id=answer)
                    except Area.DoesNotExist:
                        area = None
                    multi_answer.area = area
                    multi_answer.save()
                self.answer = ", ".join(answers)
            if self.question.type in ['map-multipoint'] and self.id:
                answers = []
                self.location_set.all().delete()
                for point in simplejson.loads(simplejson.loads(self.answer_raw)):
                        answers.append("%s,%s: %s" % (point['lat'], point['lng'] , point['answers']))
                        location = Location(lat=point['lat'], lng=point['lng'], response=self, respondant=self.respondant)
                        location.save()
                        for answer in point['answers']:
                            answer = LocationAnswer(answer=answer['text'], label=answer['label'], location=location)
                            answer.save()
                        location.save()
                self.answer = ", ".join(answers)
            if self.question.type == 'grid':
                self.gridanswer_set.all().delete()
                for answer in self.answer:
                    code = answer.get('code', None)
                    species = None
                    if code is None:
                        try:
                            species = DialectSpecies.lookup(answer['text'].strip(), None)
                        except ValidationError:
                            species = None
                    else:
                        code_match = re.search(r'\((.*)\)', code)
                        if code_match is not None:
                            species = Species.objects.get(code=code_match.group(1))
                    for grid_col in self.question.grid_cols.all():
                        if grid_col.type in ['currency', 'integer', 'number', 'single-select', 'text', 'yes-no']:
                            try:
                                grid_answer = GridAnswer(response=self,
                                    answer_text=answer[grid_col.label.replace('-', '')],
                                    answer_number=answer[grid_col.label.replace('-', '')],
                                    row_label=answer['label'].strip(), row_text=answer['text'].strip(),
                                    col_label=grid_col.label, col_text=grid_col.text, species=species)
                                grid_answer.save()
                            except Exception as e:
                                pass
                                #print "problem with ", grid_col.label
                                #print "not found in", self.answer_raw
                                #print e
                            
                        elif grid_col.type == 'multi-select':
                            try:
                                for this_answer in answer[grid_col.label.replace('-', '')]:
                                    print this_answer
                                    grid_answer = GridAnswer(response=self,
                                        answer_text=this_answer,
                                        row_label=answer['label'], row_text=answer['text'],
                                        col_label=grid_col.label, col_text=grid_col.text)
                                    grid_answer.save()
                            except:
                                pass
                                #print "problem with ", answer
                                #print e
                        else:
                            print grid_col.type
                            print answer
            try:
                respondent = Respondant.objects.get(uuid=self.respondant.uuid)
            except:
                respondent = None

            if hasattr(respondent, self.question.slug):
                setattr(respondent, self.question.slug, self.answer)
                respondent.save()

            if respondent is not None and respondent.user is not None:
                if self.question.attach_to_profile or self.question.persistent:
                    # Get this user's set of profile fields. These can be shared cross-survey (...is this still the case?)
                    if respondent.user.profile.registration and respondent.user.profile.registration != 'null':
                        profileAnswers = simplejson.loads(respondent.user.profile.registration)
                    else:
                        profileAnswers = {}
                    # Replace existing value with new value.
                    profileAnswers[self.question.slug] = self.answer
                    profile = get_object_or_404(UserProfile, user=respondent.user)
                    profile.registration = simplejson.dumps(profileAnswers)
                    profile.save()
            self.save()

            if self.question.slug == 'landed-date' or self.question.slug == 'trip-landing-date-puerto-rico':
                if respondent is not None:
                    try:
                        respondent.ordering_date = dateutil.parser.parse(self.answer)
                    except:
                        pass
                    respondent.save()
            
            if self.question.slug == 'did-not-fish-for-month-of':
                if respondent is not None:
                    self.answer = self.answer.replace('"', '')
                    from datetime import datetime
                    dnf_date = None
                    try:
                        if self.answer.find('-') != -1:
                            dnf_date = datetime.strptime(self.answer, '%Y-%m')
                        elif self.answer.find('/') != -1:
                            dnf_date = datetime.strptime(self.answer, '%Y/%m')
                    except ValueError:
                        pass
                    try:
                        dnf_date = dateutil.parser.parse(self.answer)
                    except:
                        pass
                    if dnf_date is not None:
                        respondent.ordering_date = dnf_date
                        respondent.save()

            logger.debug('finshed save related for {0}'.format(self))

def save_related(sender, instance, created, **kwargs):
    # save the related objects on initial creation
    if created:
        instance.save_related()

signals.post_save.connect(save_related, sender=Response)
