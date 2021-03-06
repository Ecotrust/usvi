from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie import fields
from tastypie.authentication import (SessionAuthentication,
                                     ApiKeyAuthentication, MultiAuthentication,
                                     Authentication)
from tastypie.exceptions import Unauthorized
from tastypie.authorization import Authorization, DjangoAuthorization
from tastypie.utils import trailing_slash

from django.conf.urls import url
from django.core.paginator import Paginator, InvalidPage
from django.http import Http404
from django.core.urlresolvers import reverse
from django.db.models import Sum

from haystack.query import SearchQuerySet

import datetime
import json

# Get an instance of a logger
import logging

# Get an instance of a logger
logger = logging.getLogger(__name__)


from survey.models import (Survey, Question, Option, Respondant, Response,
                           Page, Block, Dialect, DialectSpecies)


class SurveyModelResource(ModelResource):

    def obj_update(self, bundle, request=None, **kwargs):
        bundle = super(SurveyModelResource, self).obj_update(bundle, **kwargs)
        for field_name in self.fields:
            field = self.fields[field_name]
            if (type(field) is fields.ToOneField and field.null and
               bundle.data.get(field_name, None) is None):
                setattr(bundle.obj, field_name, None)
        bundle.obj.save()
        return bundle


class StaffUserOnlyAuthorization(Authorization):

    def read_list(self, object_list, bundle):
        # Is the requested object owned by the user?
        if bundle.request.user.is_staff:
            return object_list
        return object_list.filter(user=bundle.request.user)

    def read_detail(self, object_list, bundle):
        # Is the requested object owned by the user?
        if hasattr(bundle.obj, 'user'):
            return bundle.obj.user == bundle.request.user
        else:
            return bundle.request.user.is_staff

    def update_list(self, object_list, bundle):
        return bundle.request.user.is_staff

    def update_detail(self, object_list, bundle):
        logger.debug('update_detail StaffUserOnlyAuthorization')
        return bundle.request.user.is_staff

    def delete_list(self, object_list, bundle):
        # Sorry user, no deletes for you!
        return bundle.request.user.is_staff

    def delete_detail(self, object_list, bundle):
        return bundle.request.user.is_staff


class UserObjectsOnlyAuthorization(Authorization):

    def read_list(self, object_list, bundle):
        # This assumes a ``QuerySet`` from ``ModelResource``.
        if bundle.request.user.is_staff:
            return object_list
        else:
            return object_list.filter(user=bundle.request.user)

    def read_detail(self, object_list, bundle):
        # Is the requested object owned by the user?
        if bundle.request.user.is_staff:
            return True
        return bundle.obj.user == bundle.request.user

    def create_list(self, object_list, bundle):
        # Assuming their auto-assigned to ``user`
        return object_list

    def create_detail(self, object_list, bundle):
        return True

    def update_list(self, object_list, bundle):
        allowed = []
        # Since they may not all be saved, iterate over them.
        for obj in object_list:
            if obj.user == bundle.request.user:
                allowed.append(obj)
        return allowed

    def update_detail(self, object_list, bundle):
        logger.debug('update_detail UserObjectsOnlyAuthorization')
        if bundle.request.user.is_staff:
            return True
        return bundle.obj.user == bundle.request.user

    def delete_list(self, object_list, bundle):
        # Sorry user, no deletes for you!
        raise Unauthorized("Sorry, no deletes.")

    def delete_detail(self, object_list, bundle):
        raise Unauthorized("Sorry, no deletes.")


class ResponseResource(SurveyModelResource):
    """
    The web app uses this to craete and update answers

    """
    question = fields.ToOneField(
        'apps.survey.api.QuestionResource', 'question', full=True)
    respondant = fields.ToOneField(
        'apps.survey.api.RespondantResource', 'respondant', full=False)
    answer_count = fields.IntegerField(readonly=True)
    user = fields.ToOneField(
        'apps.account.api.UserResource', 'user', null=True, blank=True)


    def obj_create(self, bundle, **kwargs):
        # Determine user that this response belongs to
        logger.debug('obj create for response')
        if bundle.request.user.is_staff:
            respondant = self.get_via_uri(bundle.data['respondant'])
            user = respondant.user
            respondant.entered_by = bundle.request.user
            respondant.save()
        else:
            user = bundle.request.user

        return super(ResponseResource,
                     self).obj_create(bundle, user=bundle.request.user)


    # def get_via_uri(self, uri):
    #     # overriding to make it not look for offlinerespondant
    #     logger.debug('get_view_uri override')
    #     peices = uri.split("offlinerespondant/")
    #     if len(peices) > 1:
    #         uuid = peices[1].split("/")[0]
    #         respondant = Respondant.objects.get(pk=uuid)
    #         return respondant
    #     return super(ResponseResource, self).get_via_uri(uri)

    def dehydrate_answer(self, bundle):
        return json.loads(bundle.obj.answer_raw)


    class Meta:
        queryset = Response.objects.all().order_by(
            'question__question_page__order')
        filtering = {
            'answer': ALL,
            'question': ALL_WITH_RELATIONS,
            'respondant': ALL_WITH_RELATIONS
        }
        ordering = ('question__question_page__order',)
        detail_allowed_methods = ['get', 'post', 'put', 'patch']
        authorization = UserObjectsOnlyAuthorization()
        authentication = Authentication()
        # If this is enabled it will fail with a 401
        #authentication = MultiAuthentication(
        #    ApiKeyAuthentication(), SessionAuthentication())
        always_return_data = True


class OfflineResponseResource(SurveyModelResource):
    question = fields.ToOneField(
        'apps.survey.api.QuestionResource', 'question', null=True, blank=True, full=True)
    respondant = fields.ToOneField(
        'apps.survey.api.OfflineRespondantResource', 'respondant', null=True, blank=True, full=True)
    user = fields.ToOneField(
        'apps.account.api.UserResource', 'user', null=True, blank=True)

    class Meta:
        queryset = Response.objects.all().order_by(
            'question__question_page__order')
        authorization = UserObjectsOnlyAuthorization()
        authentication = MultiAuthentication(
            ApiKeyAuthentication(), SessionAuthentication())
        always_return_data = True


    def obj_create(self, bundle, **kwargs):
        return super(OfflineResponseResource,
                     self).obj_create(bundle, user=bundle.request.user)


class OfflineRespondantResource(SurveyModelResource):
    responses = fields.ToManyField(
        'apps.survey.api.OfflineResponseResource', 'response_set',
        null=True, blank=True)
    survey = fields.ToOneField(
        'apps.survey.api.SurveyResource', 'survey', null=True, blank=True)

    class Meta:
        always_return_data = True
        queryset = Respondant.objects.all()
        authorization = UserObjectsOnlyAuthorization()
        authentication = Authentication()
        # authentication = MultiAuthentication(
        #     ApiKeyAuthentication(), SessionAuthentication())
        # ordering = ['-ts']

    def obj_create(self, bundle, **kwargs):
        if not bundle.request.user.is_authenticated():
            return None
        return super(OfflineRespondantResource,
                     self).obj_create(bundle, user=bundle.request.user)

    def save_related(self, bundle):
        logger.debug('save related offline respondant')
        resource_uri = self.get_resource_uri(bundle.obj)
        user_uri = self.get_resource_uri(bundle.request.user)
        for response in bundle.data.get('responses'):
            if isinstance(response, dict):
                response['respondant'] = resource_uri
                response['user'] = user_uri


class ReportRespondantResource(SurveyModelResource):
    responses = fields.ToManyField(
        ResponseResource, 'response_set', full=False, null=True, blank=True)
    survey = fields.ToOneField(
        'apps.survey.api.SurveyResource', 'survey',
        null=True, blank=True, readonly=True)
    user = fields.ToOneField('apps.account.api.UserResource',
                             'user', null=True, blank=True,
                             full=False, readonly=True)
    survey_title = fields.CharField(attribute='survey_title', readonly=True)
    survey_slug = fields.CharField(attribute='survey_slug', readonly=True)

    class Meta:
        queryset = Respondant.objects.all().order_by('-ordering_date')
        # queryset = Respondant.objects.all().order_by('-')
        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS,
            'user': ALL_WITH_RELATIONS,
            'review_status': ALL,
            'entered_by': ALL_WITH_RELATIONS,
            'ordering_date': ['gte', 'lte'],
            'island': ALL

        }
        authorization = UserObjectsOnlyAuthorization()
        authentication = MultiAuthentication(
            ApiKeyAuthentication(), SessionAuthentication())


class DashRespondantResource(ReportRespondantResource):
    user = fields.ToOneField('apps.account.api.UserResource',
                             'user', null=True, blank=True, full=True, readonly=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource',
                               'survey', null=True, blank=True, full=False, readonly=True)
    entered_by = fields.ToOneField('apps.account.api.UserResource',
                                   'entered_by', null=True, blank=True, full=True, readonly=True)
    total_weight = fields.FloatField(null=True, blank=True)



    def prepend_urls(self):
            return [
                url(r"^(?P<resource_name>%s)/search%s$" % (self._meta.resource_name, trailing_slash()),
                    self.wrap_view('get_search'), name="api_get_search"),
            ]

    def get_object_list(self, request):
        user_tags = [tag.name for tag in request.user.profile.tags.all()]
        surveys = Survey.objects.filter(tags__name__in=user_tags)

        return super(DashRespondantResource, self).get_object_list(request).filter(survey__in=surveys)

    def get_search(self, request, **kwargs):
        self.method_check(request, allowed=['get'])
        self.is_authenticated(request)
        self.throttle_check(request)

        # Do the query.
        limit = int(request.GET.get('limit', 20))
        query = request.GET.get('q', '')
        page = int(request.GET.get('page', 1))
        start_date = request.GET.get('start_date', None)
        end_date = request.GET.get('end_date', None)
        review_status = request.GET.get('review_status', None)
        entered_by = request.GET.get('entered_by', None)
        island = request.GET.get('island', None)

        sqs = SearchQuerySet().models(Respondant).load_all()

        if query != '':
            sqs = sqs.auto_query(query)

        if not request.user.is_staff:
            sqs = sqs.filter(username = request.user.username)

        if start_date is not None:
            sqs = sqs.filter(ordering_date__gte=datetime.datetime.strptime(
                start_date + " 00:00", '%Y-%m-%d %H:%M'))
        if end_date is not None:
            sqs = sqs.filter(ordering_date__lte=datetime.datetime.strptime(
                end_date, '%Y-%m-%d') + datetime.timedelta(days=1))

        if review_status is not None:
            sqs = sqs.filter(review_status=review_status)

        if entered_by is not None:
            sqs = sqs.filter(entered_by=entered_by)
        if island is not None:
            sqs = sqs.filter(island=island)
        user_tags = [tag.name for tag in request.user.profile.tags.all()]

        if 'puerto-rico' not in user_tags:
            sqs = sqs.exclude(survey_tags__slug__exact='puerto-rico')

        if 'usvi' not in user_tags:
            sqs = sqs.exclude(survey_tags__slug__exact='usvi')

        sqs = sqs.order_by('-ordering_date')

        paginator = Paginator(sqs, limit)
        total = sqs.count()

        try:
            page = paginator.page(page)
        except InvalidPage:
            raise Http404("Sorry, no results on that page.")

        objects = []

        for result in page.object_list:
            if result is not None:
                bundle = self.build_bundle(obj=result.object, request=request)
                bundle = self.full_dehydrate(bundle)
                objects.append(bundle)

        base_url = reverse(
            'api_get_search', kwargs={'resource_name': 'dashrespondant', 'api_name': 'v1'})

        base_url = base_url + \
            "?limit={0}&q={1}&format=json".format(limit, query)

        if start_date is not None:
            base_url = base_url + "&start_date=" + start_date
        if entered_by is not None:
            base_url = base_url + "&entered_by" + entered_by
        if review_status is not None:
            base_url = review_status + "&review_status" + review_status
        if island is not None:
            base_url = base_url + "&island=" + island

        if page.has_next():
            next_url = "{0}&page={1}".format(base_url, page.next_page_number())
        else:
            next_url = None

        if page.has_previous():
            previous_url = "{0}&page={1}".format(
                base_url, page.previous_page_number())
        else:
            previous_url = None

        meta = {
            "limit": limit,
            "next": next_url,
            "previous": previous_url,
            "total_count": total,
            "pages": paginator.page_range,
            "base_url": base_url,
            "page": page.number,
            "offset": page.start_index() - 1
        }

        object_list = {
            'objects': objects,
            'meta': meta
        }

        self.log_throttled_access(request)
        return self.create_response(request, object_list)

    def dehydrate_total_weight(self, bundle):
        return bundle.obj.total_weight


class DashRespondantDetailsResource(ReportRespondantResource):
    responses = fields.ToManyField(
        ResponseResource, 'response_set', full=True, null=True, blank=True)
    user = fields.ToOneField('apps.account.api.UserResource',
                             'user', null=True, blank=True, full=True, readonly=True)


class ReportRespondantDetailsResource(ReportRespondantResource):
    responses = fields.ToManyField(
        ResponseResource, 'response_set', full=True, null=True, blank=True)
    user = fields.ToOneField('apps.account.api.UserResource',
                             'user', null=True, blank=True, full=True, readonly=True)


class RespondantResource(SurveyModelResource):
    responses = fields.ToManyField(
        ResponseResource, 'response_set', full=True, null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource',
                               'survey', null=True, blank=True, full=True, readonly=True)
    user = fields.ToOneField('apps.account.api.UserResource',
                             'user', null=True, blank=True, full=True, readonly=True)

    def alter_detail_data_to_serialize(self, request, bundle):
        if 'meta' not in bundle.data:
            bundle.data['meta'] = {}
        print request.user, bundle.obj.user
        is_impersonated = bundle.obj.user != request.user
        if is_impersonated:
            bundle.data['meta']['profile'] = json.loads(bundle.obj.user.profile.registration)
        else:
            bundle.data['meta']['profile'] = json.loads(request.user.profile.registration)
        bundle.data['meta']['is_impersonated'] = is_impersonated
        return bundle

    class Meta:
        queryset = Respondant.objects.all().order_by('-ts')
        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS,
            'uuid': ALL,
            'ts': ['gte', 'lte']
        }
        ordering = ['-ts']
        authorization = UserObjectsOnlyAuthorization()
        authentication = MultiAuthentication(
            ApiKeyAuthentication(), SessionAuthentication())


class OptionResource(SurveyModelResource):

    class Meta:
        always_return_data = True
        queryset = Option.objects.all().order_by('order')
        authorization = DjangoAuthorization()
        authentication = Authentication()


class PageResource(SurveyModelResource):
    questions = fields.ToManyField('apps.survey.api.QuestionResource',
                                   'questions', full=True, null=True,
                                   blank=True)
    blocks = fields.ToManyField('apps.survey.api.BlockResource', 'blocks',
                                full=True, null=True, blank=True)
    survey = fields.ForeignKey('apps.survey.api.SurveyResource',
                               'survey', related_name='survey', null=True,
                               blank=True)

    class Meta:
        queryset = Page.objects.all().order_by('order')
        always_return_data = True
        authorization = DjangoAuthorization()
        authentication = Authentication()
        filtering = {
            'survey': ALL_WITH_RELATIONS
        }

    # save_m2m = main_save_m2m


class PageDashResource(PageResource):
    questions = fields.ToManyField('apps.survey.api.QuestionResource',
                                   'questions', full=False, null=True,
                                   blank=True)


class BlockResource(SurveyModelResource):
    skip_question = fields.ToOneField('apps.survey.api.QuestionResource',
                                      'skip_question', null=True, blank=True)

    class Meta:
        queryset = Block.objects.all()
        always_return_data = True
        authentication = Authentication()
        authorization = DjangoAuthorization()


class DialectSpeciesResource(SurveyModelResource):

    class Meta:
        queryset = DialectSpecies.objects.all()


class QuestionResource(SurveyModelResource):
    options = fields.ToManyField(
        OptionResource, 'options', full=True, null=True, blank=True)
    grid_cols = fields.ToManyField(
        OptionResource, 'grid_cols', full=True, null=True, blank=True)
    modalQuestion = fields.ToOneField(
        'self', 'modalQuestion', full=True, null=True, blank=True)
    hoist_answers = fields.ToOneField(
        'self', 'hoist_answers', full=True, null=True, blank=True)
    foreach_question = fields.ToOneField(
        'self', 'foreach_question', full=True, null=True, blank=True)
    question_types = fields.DictField(
        attribute='question_types', readonly=True)
    report_types = fields.DictField(attribute='report_types', readonly=True)
    answer_domain = fields.ListField(
        attribute='answer_domain', readonly=True, null=True)
    filter_questions = fields.ToManyField(
        'self', 'filter_questions', null=True, blank=True)
    skip_question = fields.ToOneField(
        'self', 'skip_question', null=True, blank=True)
    blocks = fields.ToManyField(
        'apps.survey.api.BlockResource', 'blocks',
        null=True, blank=True, full=True)

    class Meta:
        queryset = Question.objects.all()
        always_return_data = True
        authorization = DjangoAuthorization()
        authentication = Authentication()
        filtering = {
            'slug': ALL,
            'surveys': ALL_WITH_RELATIONS
        }


class DialectResource(SurveyModelResource):

    class Meta:
        queryset = Dialect.objects.all()


class SurveyResource(SurveyModelResource):
    pages = fields.ToManyField(
        PageResource, 'page_set', full=True, null=True, blank=True)

    def get_object_list(self, request):
        obj_list = super(SurveyResource, self).get_object_list(request)
        if not request.user.is_anonymous():
            user_tags = [tag.name for tag in request.user.profile.tags.all()]
            return obj_list.filter(tags__name__in=user_tags)
        else:
            return obj_list

    class Meta:
        detail_uri_name = 'slug'
        queryset = Survey.objects.all()
        always_return_data = True
        authorization = DjangoAuthorization()
        authentication = Authentication()
        filtering = {
            'slug': ['exact'],
            'tags': ALL_WITH_RELATIONS
        }


    # def save_m2m(self, bundle):
    #     pass

class SurveyDashResource(SurveyResource):
    dialect = fields.ToOneField(
        'apps.survey.api.DialectResource', 'dialect', full=True,
        null=True, blank=True)

    def alter_detail_data_to_serialize(self, request, bundle):
        if 'meta' not in bundle.data:
            bundle.data['meta'] = {}

        res = DialectResource()
        request_bundle = res.build_bundle(request=request)
        queryset = res.obj_get_list(request_bundle)
        dialects = []
        for obj in queryset:
            dialect_bundle = res.build_bundle(obj=obj, request=request)
            dialects.append(res.full_dehydrate(dialect_bundle, for_list=True))

        bundle.data['meta']['dialects'] = dialects

        return bundle


class SurveyReportResource(SurveyResource):
    pages = fields.ToManyField(
        PageResource, 'pages', null=True, blank=True, full=False)
    completes = fields.IntegerField(attribute='completes', readonly=True)
    survey_responses = fields.IntegerField(
        attribute='survey_responses', readonly=True)
    activity_points = fields.IntegerField(
        attribute='activity_points', readonly=True)
    response_date_start = fields.DateField(
        attribute='response_date_start', readonly=True, null=True, blank=True)
    response_date_end = fields.DateField(
        attribute='response_date_end', readonly=True, null=True, blank=True)
    reviews_needed = fields.IntegerField(
        attribute='reviews_needed', readonly=True)
    flagged = fields.IntegerField(attribute='flagged', readonly=True)

    def alter_detail_data_to_serialize(self, request, bundle):
        if 'meta' not in bundle.data:
            bundle.data['meta'] = {}

        bundle.data['meta'] = {
            "entered_by": [u['entered_by__username'] for u in bundle.obj.respondant_set.exclude(entered_by=None)
                           .values('entered_by__username').distinct()]
        }
        return bundle




# Based off of ``piston.utils.coerce_put_post``. Similarly BSD-licensed.
# And no, the irony is not lost on me.
def convert_post_to_VERB(request, verb):
    """
    Force Django to process the VERB.
    """
    if request.method == verb:
        if hasattr(request, '_post'):
            del(request._post)
            del(request._files)

        try:
            request.method = "POST"
            request._load_post_and_files()
            request.method = verb
        except AttributeError:
            request.META['REQUEST_METHOD'] = 'POST'
            request._load_post_and_files()
            request.META['REQUEST_METHOD'] = verb
        setattr(request, verb, request.POST)

    return request

def convert_post_to_put(request):
    return convert_post_to_VERB(request, verb='PUT')


def convert_post_to_patch(request):
    print "Converting post to patch"
    return convert_post_to_VERB(request, verb='PATCH')

