from decimal import Decimal
from django.db import models
from django.db.models import Max, Min, Count, Sum
from django.contrib.auth.models import User
from django.db.models import signals
from django.shortcuts import get_object_or_404
from account.models import UserProfile
from ordereddict import OrderedDict

import dateutil.parser
import datetime
import uuid
import simplejson
import caching.base


def make_uuid():
    return str(uuid.uuid4())


STATE_CHOICES = (
    ('complete', 'Complete'),
    ('terminate', 'Terminate'),
)


class Respondant(caching.base.CachingMixin, models.Model):
    uuid = models.CharField(max_length=36, primary_key=True, default=make_uuid, editable=False)
    survey = models.ForeignKey('Survey')
    responses = models.ManyToManyField('Response', related_name='responses', null=True, blank=True)
    complete = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATE_CHOICES, default=None, null=True, blank=True)
    last_question = models.CharField(max_length=240, null=True, blank=True)

    county = models.CharField(max_length=240, null=True, blank=True)
    state = models.CharField(max_length=240, null=True, blank=True)
    locations = models.IntegerField(null=True, blank=True)

    ts = models.DateTimeField(default=datetime.datetime.now())
    email = models.EmailField(max_length=254, null=True, blank=True, default=None)
    ordering_date = models.DateTimeField(null=True, blank=True)

    csv_row = models.ForeignKey('reports.CSVRow', null=True, blank=True)

    user = models.ForeignKey(User, null=True, blank=True)

    objects = caching.base.CachingManager()

    def __unicode__(self):
        if self.email:
            return "%s" % self.email
        else:
            return "%s" % self.uuid

    def clone(self):
        """
        Make a copy of the respondant all its responses.
        Mainly used to generate test data.
        
        """

        new_resp = self
        responses = new_resp.response_set.all()

        new_resp.pk = None
        new_resp.uuid = make_uuid()
        new_resp.save()

        # Copy responses
        for response in responses:
            response.id = None
            response.respondant = new_resp
            response.save()

        return new_resp
        



    @property
    def survey_title(self):
        if self.survey.slug == 'monitoring-project':
            try:
                org_name = self.responses.filter(question__slug='org-name')[0].answer
            except:
                org_name = 'Unknown'
            try:
                project_title = self.responses.filter(question__slug='proj-title')[0].answer
            except:
                project_title = 'Unknown'
            return '%s &ndash; %s' % (org_name, project_title)
        else:
            return self.survey.name
    
    @property
    def survey_slug(self):
        return self.survey.slug

    @property
    def project_name(self):
        try:
            return self.responses.filter(question__slug='proj-title')[0].answer
        except:
            return 'unavailable'

    @property
    def organization_name(self):
        try:
            return self.responses.filter(question__slug='org-name')[0].answer
        except:
            return 'unavailable'

    @property
    def monitored_ecosystem_features(self):
        try:
            return self.responses.filter(question__slug='ecosystem-features')[0].answer
        except:
            return 'unavailable'

    @property
    def duration(self):
        try:
            return self.responses.filter(question__slug='proj-data-years')[0].answer
        except:
            return 'unavailable'


    @property
    def frequency(self):
        try:
            return self.responses.filter(question__slug='proj-data-frequency')[0].answer
        except:
            return 'unavailable'

    @property
    def answers_list(self):
        answers = self.response_set.all().values('answer')
        return [a['answer'] for a in answers]
        

    def save(self, *args, **kwargs):
        if self.uuid and ":" in self.uuid:
            self.uuid = self.uuid.replace(":", "_")
        if not self.ts:
            self.ts = datetime.datetime.utcnow().replace(tzinfo=utc)
        self.locations = self.location_set.all().count()

        if not self.csv_row:
            # Circular import dodging
            from apps.reports.models import CSVRow
            self.csv_row = CSVRow.objects.create()

        super(Respondant, self).save(*args, **kwargs)
            
        # Do this after saving so save_related is called to catch
        # all the updated responses.
        self.update_csv_row()

    def update_csv_row(self):
        self.csv_row.json_data = simplejson.dumps(self.generate_flat_dict())
        self.csv_row.save()

    @classmethod
    def get_field_names(cls):
        return OrderedDict((
            ('model-uuid', 'UUID'),
            ('model-timestamp', 'Date of survey'),
            ('model-email', 'Email'),
            ('model-complete', 'Complete'),
        ))

    def generate_flat_dict(self):
        flat = {
            'model-uuid': self.uuid,
            'model-timestamp': str(self.ts),
            'model-email': self.user.email,
            'model-complete': self.complete,
        }
        for response in self.response_set.all().select_related('question'):
            if response.question.type != 'info':
                flat.update(response.generate_flat_dict())
        return flat

    @classmethod
    def stats_report_filter(cls, survey_slug, start_date=None,
                            end_date=None):

        qs = cls.objects.filter(survey__slug=survey_slug)

        if start_date is not None:
            qs = qs.filter(ts__gte=start_date)

        if end_date is not None:
            qs = qs.filter(ts__lt=end_date)

        return qs


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

    def __unicode__(self):
        if self.survey is not None and self.question is not None:
            return "%s (%s)" % (self.survey.name, ", ".join([question.slug for question in self.questions.all()]))
        else:
            return "NA"
    class Meta:
        ordering = ['order']

    def __unicode__(self):
        question_names = ', '.join([question.slug for question in self.questions.all()])
        survey_name = "No Survey"
        if hasattr(self.survey, 'name'):
            survey_name = self.survey.name
        return "%s (%s)" % (survey_name, question_names)


class Survey(caching.base.CachingMixin, models.Model):
    name = models.CharField(max_length=254)
    slug = models.SlugField(max_length=254, unique=True)
    questions = models.ManyToManyField('Question', null=True, blank=True, through="Page")
    states = models.CharField(max_length=200, null=True, blank=True)
    anon = models.BooleanField(default=True)
    offline = models.BooleanField(default=False)

    objects = caching.base.CachingManager()

    @property
    def num_registered(self):
        return self.respondant_set.values('user').distinct().count()

    @property
    def survey_responses(self):
        return self.respondant_set.all().count()

    @property
    def completes(self):
        return self.respondant_set.filter(complete=True).count()

    def incompletes(self):
        return self.respondant_set.filter(complete=False).count()

    @property
    def activity_points(self):
        return Location.objects.filter(response__respondant__in=self.respondant_set.filter(complete=True)).count()

    @property
    def total_sites(self):
        """
        The sum of all points and unique planning unit ids. 

        Returns and integer
        """
        num_pus = PlanningUnitAnswer.objects.filter(respondant__in=self.respondant_set.filter(complete=True)).values('unit').distinct().count()
        num_points = Location.objects.filter(response__respondant__in=self.respondant_set.filter(complete=True)).count()

        return num_points + num_pus
    

    @property
    def num_orgs(self):
        """
        Trys to get the total number of distinct organizations that responded based on Org name.

        Returns an Integer
        """
        
        return Response.objects.filter(respondant__survey=self, respondant__complete = True, question__slug='org-name').values('answer').distinct().count()

         




    def generate_field_names(self):
        fields = OrderedDict()
        for q in Question.objects.filter(question_page__survey=self).order_by('question_page__order', 'order'):
            if q.type == 'grid':
                if q.rows:
                    for row in q.rows.splitlines():
                        row_slug = (row.lower().replace(' ', '-')
                                               .replace('(', '')
                                               .replace(')', '')
                                               .replace('/', ''))
                        field_slug = q.slug + '-' + row_slug
                        field_name = q.label + ' - ' + row
                        fields[field_slug] = field_name
                else:
                    rows = (q.response_set
                             .exclude(gridanswer__row_label__isnull=True)
                             .values_list('gridanswer__row_label',
                                          'gridanswer__row_text')
                             .distinct())
                    for slug, text in rows:
                        fields[q.slug + '-' + slug] = q.label + ' - ' + text
            elif q.type != 'info':
                fields[q.slug] = q.label
        return fields        

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
    ('zipcode', 'Zipcode (5 or 9 digit)'),
    ('phone', 'Phone (international)'),
    ('url', 'URL'),
)

class Option(caching.base.CachingMixin, models.Model):
    text = models.CharField(max_length=254)
    label = models.SlugField(max_length=64)
    type = models.CharField(max_length=20,choices=QUESTION_TYPE_CHOICES,default='integer')
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
    rows = models.TextField(null=True, blank=True,
        help_text="""A newline seperated list of options. These can be placed 
            an categories by starting a category with a '*'. DO NOT USE THE '&' 
            character anywhere in here. """)
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
    public = models.BooleanField(default=True)
    modalQuestion = models.ForeignKey('self', null=True, blank=True, related_name="modal_question")
    hoist_answers = models.ForeignKey('self', null=True, blank=True, related_name="hoisted")
    foreach_question = models.ForeignKey('self', null=True, blank=True, related_name="foreach")
    pre_calculated = models.TextField(null=True, blank=True)


    # backend stuff
    filterBy = models.BooleanField(default=False)
    visualize = models.BooleanField(default=False)
    report_type = models.CharField(max_length=20,choices=REPORT_TYPE_CHOICES,null=True, default=None)
    filter_questions = models.ManyToManyField('self', null=True, blank=True)

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

    def save(self, *args, **kwargs):
        super(Question, self).save(*args, **kwargs)

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


    @property
    def rows2list(self):
        out = [row.strip() for row in self.rows.split("\n")]
        return out

    def sort_by_rows(self, x):
        choices = self.rows2list
        _map = dict((val, i) for i, val in enumerate(choices))
        return _map[x['answer']]

    def get_answer_domain(self, survey, filters=None):
        # Get the full response set.
        answers = self.response_set.filter(respondant__complete=True)
        if self.type in ['map-multipoint']:
            locations = LocationAnswer.objects.filter(location__response__in=answers)

        # Apply filters.        
        if filters is not None:
            for filter in filters:
                slug = filter.keys()[0]
                values = filter[slug]
                
                # Allow wildcard in slug. To do this, we merge response sets 
                # from all maching questions and use that merged response set
                # to filter. This gives an OR filter accross the questions 
                # macthing the wildcard rather than an AND filter.
                if slug.find('*') == -1:
                    filter_questions = Question.objects.filter(slug=slug, question_page__survey=survey)
                else:
                    filter_questions = Question.objects.filter(slug__contains=slug.replace('*', ''),question_page__survey=survey)
                merged_filter_response_sets = None
                for fq in filter_questions:
                    for val in values:
                        if merged_filter_response_sets is not None:
                            merged_filter_response_sets = merged_filter_response_sets | fq.response_set.filter(answer__contains=val)
                        else:
                            merged_filter_response_sets = fq.response_set.filter(answer__contains=val)

                if self.type in ['map-multipoint']:
                    if filter_question == self:
                        locations = locations.filter(answer__in=values)
                    else:
                        answers = answers.filter(respondant__response_set__in=merged_filter_response_sets)
                        locations = locations.filter(location__response__in=answers)
                else:
                    for item in values:
                        answers = answers.filter(respondant__responses__in=merged_filter_response_sets)
        
        # Group for counts.
        if self.type in ['map-multipoint']:
            return locations.values('answer', 'location__lat', 'location__lng').annotate(locations=Count('answer'), surveys=Count('location__respondant', distinct=True))
        elif self.type in ['multi-select']:
            return (MultiAnswer.objects.filter(response__in=answers)
                                       .values('answer_text')
                                       .annotate(surveys=Count('answer_text')))
        elif self.rows:

            res = (answers.values('answer')
                           .annotate(locations=Sum('respondant__locations'), surveys=Count('answer')))
            out = sorted(res, key=self.sort_by_rows)

            return out
        else:
            

            return (answers.values('answer')
                           .annotate(locations=Sum('respondant__locations'), surveys=Count('answer')))
    @property
    def contained_in(self):
        return [obj for obj in self.question_page.all()]


    def __unicode__(self):
        return "%s/%s/%s" % (self.survey_slug, self.slug, self.type)


class LocationAnswer(caching.base.CachingMixin, models.Model):
    answer = models.TextField(null=True, blank=True, default=None)
    label = models.TextField(null=True, blank=True, default=None)
    location = models.ForeignKey('Location')
    geojson = models.TextField(null=True, blank=True, default=None)
    
    def __unicode__(self):
        return "%s/%s" % (self.location.response.respondant.uuid, self.answer)

    def save(self, *args, **kwargs):
        d = {
            'type': "Feature",
            'properties': {
                'activity': self.answer,
                'label': self.label
            },
            'geometry': {
                'type': "Point",
                'coordinates': [self.location.lng, self.location.lat]
            }
        }
        self.geojson = simplejson.dumps(d)
        super(LocationAnswer, self).save(*args, **kwargs)


class Location(caching.base.CachingMixin, models.Model):
    response = models.ForeignKey('Response')
    respondant = models.ForeignKey('Respondant', null=True, blank=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7)
    lng = models.DecimalField(max_digits=10, decimal_places=7)

    def __unicode__(self):
        return "%s/%s/%s" % (self.response.respondant.survey.slug, self.response.question.slug, self.response.respondant.uuid)


class PlanningUnitAnswer(caching.base.CachingMixin, models.Model):
    unit = models.IntegerField(null=True, blank=True)
    answer = models.TextField(null=True, blank=True, default=None)
    response = models.ForeignKey('Response')
    respondant = models.ForeignKey('Respondant', null=True, blank=True)
    related_question_slug = models.SlugField(max_length=64)

    def __unicode__(self):
        return "%s/%s/%s" % (self.response.respondant.survey.slug, self.response.question.slug, self.response.respondant.uuid)

    @property
    def ecosystem_feature_verbose(self):
        # This is used on the planning unit popup
        return self.response.question.label.split(" - ")[0].strip()

    @property
    def ecosystem_feature(self):
        # This is used on the planning unit popup
        return self.response.question.slug


    @property
    def project(self):
        return self.respondant.project_name

class MultiAnswer(caching.base.CachingMixin, models.Model):
    response = models.ForeignKey('Response')
    answer_text = models.TextField()
    answer_label = models.TextField(null=True, blank=True)


class GridAnswer(caching.base.CachingMixin, models.Model):
    response = models.ForeignKey('Response')
    row_text = models.TextField(null=True, blank=True)
    row_label = models.TextField(null=True, blank=True)
    col_text = models.TextField(null=True, blank=True)
    col_label = models.TextField(null=True, blank=True)
    answer_text = models.TextField(null=True, blank=True)
    answer_number = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __unicode__(self):
        return "%s: %s" % (self.row_text, self.col_text)


class Response(caching.base.CachingMixin, models.Model):
    question = models.ForeignKey(Question)
    respondant = models.ForeignKey(Respondant, null=True, blank=True)
    answer = models.TextField(null=True, blank=True)
    answer_number = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    answer_raw = models.TextField(null=True, blank=True)
    answer_date = models.DateTimeField(null=True, blank=True)
    unit = models.TextField(null=True, blank=True)
    ts = models.DateTimeField(default=datetime.datetime.now())
    user = models.ForeignKey(User, null=True, blank=True)
    objects = caching.base.CachingManager()

    def save(self, *args, **kwargs):
        if not self.ts:
            self.ts = datetime.datetime.utcnow().replace(tzinfo=utc)
        super(Response, self).save(*args, **kwargs)

    def generate_flat_dict(self):
        flat = {}
        if self.answer_raw:
            if self.question.type in ('text', 'textarea', 'yes-no',
                                      'single-select', 'auto-single-select',
                                      'timepicker', 'multi-select', 'url',
                                      'phone', 'zipcode', 'map-multipolygon',
                                      'map-multipoint'):
                flat[self.question.slug] = self.answer
            elif self.question.type in ('currency', 'integer', 'number'):
                flat[self.question.slug] = self.answer
            elif self.question.type == 'datepicker':
                flat[self.question.slug] = self.answer_date.strftime('%d/%m/%Y')
            elif self.question.type == 'grid':
                for answer in self.gridanswer_set.all():
                    flat[self.question.slug + '-' + answer.row_label + '-' + answer.col_label] = answer.answer_text
            elif self.question.type == 'map-multipoint':
                a = 0
                # for location in self.location_set.all():
                #     locationAnswers = LocationAnswer.objects.filter(location__exact=location)
                #     for locationAnswer in locationAnswers: 
                #         flat[self.question.slug + '-(' + str(location.lat) + ',' + str(location.lng) +')'] = locationAnswer.answer
            elif self.question.type == 'info':
                pass
            else:
                raise NotImplementedError(
                    ('Found unknown question type of {0} while processing '
                     'response id {1}').format(self.question.type, self.id)
                )
            return flat

    def save_related(self):
        if self.answer_raw:
            self.answer = simplejson.loads(self.answer_raw)
            if self.question.type in ['datepicker']:
                self.answer_date = datetime.datetime.strptime(self.answer, '%d/%m/%Y')
            elif self.question.type in ['currency', 'integer', 'number']:
                if isinstance(self.answer, (int, long, float, complex)):
                    self.answer_number = self.answer
                else:
                    self.answer = None
            elif self.question.type in ['auto-single-select', 'single-select', 'yes-no']:
                answer = simplejson.loads(self.answer_raw)

                if answer.has_key('name'):
                    self.answer = answer['name'].strip()
                elif answer.has_key('text'):
                    self.answer = answer['text'].strip()

                if answer.has_key('other') and answer['other']:
                    self.answer = "[Other]" + self.answer


            elif self.question.type in ['auto-multi-select', 'multi-select']:
                answers = []
                self.multianswer_set.all().delete()
                for answer in simplejson.loads(self.answer_raw):
                    if answer.has_key('name'):
                        answer_text = answer['name'].strip()
                    elif answer.has_key('text'):
                        answer_text = answer['text'].strip()

                    if answer.has_key('other') and answer['other']:
                        answer_text = "[Other]" + answer_text

                    answers.append(answer_text)
                    answer_label = answer.get('label', None)
                    multi_answer = MultiAnswer(response=self, answer_text=answer_text, answer_label=answer_label)
                    multi_answer.save()
                self.answer = "; ".join(answers)

            elif self.question.type in ['map-multipoint'] and self.id:
                answers = []
                self.location_set.all().delete()
                for point in simplejson.loads(self.answer_raw):
                    answers.append("%s,%s: %s" % (point['lat'], point['lng'], point['answers']))
                    location = Location(lat=Decimal(str(point['lat'])), lng=Decimal(str(point['lng'])), response=self, respondant=self.respondant)
                    location.save()
                    for answer in point['answers']:
                        answer = LocationAnswer(answer=answer['text'], label=answer['label'], location=location)
                        answer.save()
                    location.save()
                self.answer = ", ".join(answers)

            elif self.question.type in ['map-multipolygon']:
                answers = []
                self.planningunitanswer_set.all().delete()
                for pu_obj in simplejson.loads(self.answer_raw):
                    pua = PlanningUnitAnswer(unit=pu_obj['id'],
                                             answer=simplejson.dumps(pu_obj), 
                                             related_question_slug=pu_obj['qSlug'], 
                                             response=self, 
                                             respondant=self.respondant)
                    pua.save()

            elif self.question.type == 'grid':
                self.gridanswer_set.all().delete()
                for answer in self.answer:
                    for grid_col in self.question.grid_cols.all():
                        if grid_col.type in ['currency', 'integer', 'number', 'single-select', 'text', 'yes-no']:
                            try:
                                grid_answer = GridAnswer(response=self,
                                    answer_text=answer[grid_col.label.replace('-', '')],
                                    answer_number=answer[grid_col.label.replace('-', '')],
                                    row_label=answer['label'], row_text=answer['text'],
                                    col_label=grid_col.label, col_text=grid_col.text)
                                grid_answer.save()
                            except Exception as e:
                                print "problem with %s in response id %s" % (grid_col.label, self.id)
                                print "not found in", self.answer_raw
                                print e

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
                                print "problem with ", answer
                                print e
                        else:
                            print grid_col.type
                            print answer
            question_slug = self.question.slug.replace('-', '_')
            if hasattr(self.respondant, question_slug):
                # Switched to filter and update rather than just modifying and
                # saving. This doesn't trigger post_save, but still updates
                # self.respondant and the related CSVRow object.
                (Respondant.objects.filter(pk=self.respondant.pk)
                                   .update(**{question_slug: self.answer}))
                setattr(self.respondant, question_slug, self.answer)
                self.respondant.save()
                self.respondant.update_csv_row()
            self.save()

    def __unicode__(self):
        if self.respondant and self.question:
            return "%s/%s (%s)" %(self.respondant.survey.slug, self.question.slug, self.respondant.uuid)
        else:
            return "No Respondant"


def save_related(sender, instance, created, **kwargs):
    # save the related objects on initial creation
    if created:
        instance.save_related()

signals.post_save.connect(save_related, sender=Response)
