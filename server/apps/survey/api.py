from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie import fields

from tastypie.authentication import Authentication
from tastypie.authorization import Authorization

from django.conf.urls import url
from django.db.models import Avg, Max, Min, Count
from django.core.paginator import Paginator, InvalidPage
from django.http import Http404
from haystack.query import SearchQuerySet
from haystack.query import SQ

from tastypie.resources import ModelResource
from tastypie.utils import trailing_slash

from survey.models import Survey, Question, Option, Respondant, Response, Page, Block, Dialect, DialectSpecies


class SurveyModelResource(ModelResource):
    def obj_update(self, bundle, request=None, **kwargs):
        bundle = super(SurveyModelResource, self).obj_update(bundle, **kwargs)
        for field_name in self.fields:
            field = self.fields[field_name]
            if type(field) is fields.ToOneField and field.null and bundle.data.get(field_name, None) is None:
                setattr(bundle.obj, field_name, None)
        bundle.obj.save()

        return bundle

class StaffUserOnlyAuthorization(Authorization):

    # def create_list(self, object_list, bundle):
    #     # Assuming their auto-assigned to ``user``.
    #     return bundle.request.user.is_staff

    # def create_detail(self, object_list, bundle):
    #     return bundle.request.user.is_staff

    def update_list(self, object_list, bundle):
        return bundle.request.user.is_staff

    def update_detail(self, object_list, bundle):
        return bundle.request.user.is_staff

    def delete_list(self, object_list, bundle):
        # Sorry user, no deletes for you!
        return bundle.request.user.is_staff

    def delete_detail(self, object_list, bundle):
        return bundle.request.user.is_staff

class UserObjectsOnlyAuthorization(Authorization):
    def read_list(self, object_list, bundle):
        # This assumes a ``QuerySet`` from ``ModelResource``.
        return object_list.filter(user=bundle.request.user)

    def read_detail(self, object_list, bundle):
        # Is the requested object owned by the user?
        return bundle.obj.user == bundle.request.user

    def create_list(self, object_list, bundle):
        # Assuming their auto-assigned to ``user`
        return object_list

    def create_detail(self, object_list, bundle):
        return bundle.obj.user == bundle.request.user

    def update_list(self, object_list, bundle):
        allowed = []

        # Since they may not all be saved, iterate over them.
        for obj in object_list:
            if obj.user == bundle.request.user:
                allowed.append(obj)

        return allowed

    def update_detail(self, object_list, bundle):
        return bundle.obj.user == bundle.request.user

    def delete_list(self, object_list, bundle):
        # Sorry user, no deletes for you!
        raise Unauthorized("Sorry, no deletes.")

    def delete_detail(self, object_list, bundle):
        raise Unauthorized("Sorry, no deletes.")

class ResponseResource(SurveyModelResource):
    question = fields.ToOneField('apps.survey.api.QuestionResource', 'question', full=True)
    respondant = fields.ToOneField('apps.survey.api.RespondantResource', 'respondant', full=False)
    answer_count = fields.IntegerField(readonly=True)

    class Meta:
        queryset = Response.objects.all().order_by('question__question_page__order')
        filtering = {
            'answer': ALL,
            'question': ALL_WITH_RELATIONS,
            'respondant': ALL_WITH_RELATIONS
        }
        ordering = ('question__question_page__order',)


class OfflineResponseResource(SurveyModelResource):
    question = fields.ToOneField('apps.survey.api.QuestionResource', 'question', null=True, blank=True)
    respondant = fields.ToOneField('apps.survey.api.OfflineRespondantResource', 'respondant')
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True)
    
    class Meta:
        queryset = Response.objects.all().order_by('question__question_page__order')
        authorization = UserObjectsOnlyAuthorization()
        authentication = Authentication()
    
    def obj_create(self, bundle, **kwargs):
        return super(OfflineResponseResource, self).obj_create(bundle, user=bundle.request.user)


class OfflineRespondantResource(SurveyModelResource):
    responses = fields.ToManyField('apps.survey.api.OfflineResponseResource', 'response_set', null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource', 'survey', null=True, blank=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True)

    class Meta:
        always_return_data = True
        queryset = Respondant.objects.all()
        authorization = UserObjectsOnlyAuthorization()
        authentication = Authentication()
        ordering = ['-ts']
    
    def obj_create(self, bundle, **kwargs):
        if not bundle.request.user.is_authenticated():
            return None
        return super(OfflineRespondantResource, self).obj_create(bundle, user=bundle.request.user)

    def save_related(self, bundle):
        resource_uri = self.get_resource_uri(bundle.obj)
        user_uri = self.get_resource_uri(bundle.request.user)
        for response in bundle.data.get('responses'):
            response['respondant'] = resource_uri
            response['user'] = user_uri

class ReportRespondantResource(SurveyModelResource):
    responses = fields.ToManyField(ResponseResource, 'response_set', full=False, null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource', 'survey', null=True, blank=True, readonly=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=False, readonly=True)
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
            'ordering_date': ['gte', 'lte'],
            'island': ALL

        }
        #ordering = ['-ordering_date']
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()


class DashRespondantResource(ReportRespondantResource):
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=True, readonly=True)

    def prepend_urls(self):
            return [
                url(r"^(?P<resource_name>%s)/search%s$" % (self._meta.resource_name, trailing_slash()), self.wrap_view('get_search'), name="api_get_search"),
            ]

    def get_search(self, request, **kwargs):
        self.method_check(request, allowed=['get'])
        self.is_authenticated(request)
        self.throttle_check(request)

        # Do the query.
        limit = int(request.GET.get('limit', 20))
        query = request.GET.get('q', '')
        page = int(request.GET.get('page', 1))

        sqs =  SearchQuerySet().models(Respondant).load_all().filter(content__contains=query)# .auto_query(query)

        paginator = Paginator(sqs, limit)
        total = sqs.count()

        try:
            page = paginator.page(page)
        except InvalidPage:
            raise Http404("Sorry, no results on that page.")

        

        objects = []

        for result in page.object_list:
            bundle = self.build_bundle(obj=result.object, request=request)
            bundle = self.full_dehydrate(bundle)
            objects.append(bundle)

          
        url = reverse('api_get_search', kwargs={'resource_name': 'dashrespondant', 'api_name': 'v1'})
        
        if page.has_next():
            next_url = "{0}?q={1}&page={2}&limit={3}&format=json".format(url, query, page.next_page_number(), limit)
        else:
            next_url = None

        if page.has_previous():
            previous_url = "{0}?q={1}&page={2}&limit={3}&format=json".format(url, query, page.previous_page_number(), limit)
        else:
            previous_url = None
        
        meta = {
            "limit": limit,
            "next": next_url,
            "previous": previous_url,
            "total_count": total
        }

        object_list = {
            'objects': objects,
            'meta': meta
        }

        self.log_throttled_access(request)
        return self.create_response(request, object_list)

class DashRespondantDetailsResource(ReportRespondantResource):
    responses = fields.ToManyField(ResponseResource, 'response_set', full=True, null=True, blank=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=True, readonly=True)


class ReportRespondantDetailsResource(ReportRespondantResource):
    responses = fields.ToManyField(ResponseResource, 'response_set', full=True, null=True, blank=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=True, readonly=True)
    

class RespondantResource(SurveyModelResource):
    responses = fields.ToManyField(ResponseResource, 'response_set', full=True, null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource', 'survey', null=True, blank=True, full=True, readonly=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=True, readonly=True)

    class Meta:
        queryset = Respondant.objects.all().order_by('-ts')
        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS,
            'uuid': ALL,
            'ts': ['gte', 'lte']
        }
        ordering = ['-ts']
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()


class OptionResource(SurveyModelResource):
    class Meta:
        always_return_data = True
        queryset = Option.objects.all().order_by('order')
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()


    # save_m2m = main_save_m2m


class PageResource(SurveyModelResource):
    questions = fields.ToManyField('apps.survey.api.QuestionResource', 'questions', full=True, null=True, blank=True)
    blocks = fields.ToManyField('apps.survey.api.BlockResource', 'blocks', full=True, null=True, blank=True)
    survey = fields.ForeignKey('apps.survey.api.SurveyResource', 'survey', related_name='survey', null=True, blank=True)

    class Meta:
        queryset = Page.objects.all().order_by('order')
        always_return_data = True
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()
        filtering = {
            'survey': ALL_WITH_RELATIONS
        }

    # save_m2m = main_save_m2m


class PageDashResource(PageResource):
    questions = fields.ToManyField('apps.survey.api.QuestionResource', 'questions', full=False, null=True, blank=True)


class BlockResource(SurveyModelResource):
    skip_question = fields.ToOneField('apps.survey.api.QuestionResource', 'skip_question', null=True, blank=True)

    class Meta:
        queryset = Block.objects.all()
        always_return_data = True
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()


class DialectSpeciesResource(SurveyModelResource):

    class Meta:
        queryset = DialectSpecies.objects.all()


class QuestionResource(SurveyModelResource):
    options = fields.ToManyField(OptionResource, 'options', full=True, null=True, blank=True)
    grid_cols = fields.ToManyField(OptionResource, 'grid_cols', full=True, null=True, blank=True)
    modalQuestion = fields.ToOneField('self', 'modalQuestion', full=True, null=True, blank=True)
    hoist_answers = fields.ToOneField('self', 'hoist_answers', full=True, null=True, blank=True)
    foreach_question = fields.ToOneField('self', 'foreach_question', full=True, null=True, blank=True)
    question_types = fields.DictField(attribute='question_types', readonly=True)
    report_types = fields.DictField(attribute='report_types', readonly=True)
    answer_domain = fields.ListField(attribute='answer_domain', readonly=True, null=True)
    filter_questions = fields.ToManyField('self', 'filter_questions', null=True, blank=True)
    skip_question = fields.ToOneField('self', 'skip_question', null=True, blank=True)
    blocks = fields.ToManyField('apps.survey.api.BlockResource', 'blocks', null=True, blank=True, full=True)

    class Meta:
        queryset = Question.objects.all()
        always_return_data = True
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()
        filtering = {
            'slug': ALL,
            'surveys': ALL_WITH_RELATIONS
        }


class DialectResource(SurveyModelResource):
    class Meta:
        queryset = Dialect.objects.all()

class SurveyResource(SurveyModelResource):
    # questions = fields.ToManyField(QuestionResource, 'questions', full=True, null=True, blank=True)
    #question = fields.ToOneField(QuestionResource, 'question', full=True, null=True, blank=True)
    pages = fields.ToManyField(PageResource, 'page_set', full=True, null=True, blank=True)
 
    class Meta:
        detail_uri_name = 'slug'
        queryset = Survey.objects.all()
        always_return_data = True
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()
        filtering = {
            'slug': ['exact']
        }


    # def save_m2m(self, bundle):
    #     pass

class SurveyDashResource(SurveyResource):
    dialect = fields.ToOneField('apps.survey.api.DialectResource', 'dialect', full=True, null=True, blank=True)

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
    pages = fields.ToManyField(PageResource, 'pages', null=True, blank=True, full=False)
    completes = fields.IntegerField(attribute='completes', readonly=True)
    survey_responses = fields.IntegerField(attribute='survey_responses', readonly=True)
    activity_points = fields.IntegerField(attribute='activity_points', readonly=True)
    response_date_start = fields.DateField(attribute='response_date_start', readonly=True, null=True, blank=True)
    response_date_end = fields.DateField(attribute='response_date_end', readonly=True, null=True, blank=True)
    reviews_needed = fields.IntegerField(attribute='reviews_needed', readonly=True)
    flagged = fields.IntegerField(attribute='flagged', readonly=True)