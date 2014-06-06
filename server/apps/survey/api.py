from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie import fields, utils

from tastypie.authentication import SessionAuthentication, Authentication
from tastypie.authorization import DjangoAuthorization, Authorization
from django.conf.urls import url
from django.db.models import Avg, Max, Min, Count

from survey.models import Survey, Question, Option, Respondant, Response, Page, Block

from django.db.models import Q

# def main_save_m2m(self, bundle):
#     for field_name, field_object in self.fields.items():
#         if not getattr(field_object, 'is_m2m', False):
#             continue

#         if not field_object.attribute:
#             continue

#         if field_object.readonly:
#             continue

#         # Get the manager.
#         related_mngr = getattr(bundle.obj, field_object.attribute)
#             # This is code commented out from the original function
#             # that would clear out the existing related "Person" objects
#         if hasattr(related_mngr, 'clear'):
#             #Clear it out, just to be safe.
#             related_mngr.clear()

#         related_objs = []

#         for related_bundle in bundle.data[field_name]:
#             try:
#                 obj = related_mngr.model.objects.get(id=related_bundle.obj.id)
#             except related_mngr.model.DoesNotExist:
#                 print "could not get object"
#                 obj = related_bundle.obj
#                 obj.save()

#             related_objs.append(obj)

#         related_mngr.add(*related_objs)


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
    answer_count = fields.IntegerField(readonly=True)

    class Meta:
        queryset = Response.objects.all()
        filtering = {
            'answer': ALL,
            'question': ALL_WITH_RELATIONS
        }
        ordering = ['question__order']

class OfflineResponseResource(SurveyModelResource):
    question = fields.ToOneField('apps.survey.api.QuestionResource', 'question', null=True, blank=True)
    respondant = fields.ToOneField('apps.survey.api.OfflineRespondantResource', 'respondant')
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True)
    class Meta:
        queryset = Response.objects.all()
        authorization = UserObjectsOnlyAuthorization()
        authentication = Authentication()
    def obj_create(self, bundle, **kwargs):
        return super(OfflineResponseResource, self).obj_create(bundle, user=bundle.request.user)

class OfflineRespondantResource(SurveyModelResource):
    responses = fields.ToManyField('apps.survey.api.OfflineResponseResource', 'responses', null=True, blank=True)
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
    responses = fields.ToManyField(ResponseResource, 'responses', full=False, null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource', 'survey', null=True, blank=True, readonly=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=False, readonly=True)
    survey_title = fields.CharField(attribute='survey_title', readonly=True)
    survey_slug = fields.CharField(attribute='survey_slug', readonly=True)

    class Meta:
        queryset = Respondant.objects.all().order_by('-ordering_date')
        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS,
            'user': ALL_WITH_RELATIONS,
            'complete': ['exact'],
            'ts': ['gte','lte']
        }
        #ordering = ['-ordering_date']
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()

class CompleteRespondantResource(ReportRespondantResource):
    project_name = fields.CharField(attribute='project_name', readonly=True)
    organization_name = fields.CharField(attribute='organization_name', readonly=True)
    ecosystem_features = fields.CharField(attribute='monitored_ecosystem_features', readonly=True)
    duration = fields.CharField(attribute='duration', readonly=True)
    frequency = fields.CharField(attribute='frequency', readonly=True)

    def apply_filters(self, request, applicable_filters):
        # This enables filtering on items not included in the model.

        semi_filtered = super(CompleteRespondantResource, self).apply_filters(request, applicable_filters)

        if 'ef' in request.GET:
            # Include respondants that had any of the queried ecosystem features (OR them together)
            efs = request.GET['ef'].split(',')
            ef_filter = Q()
            for ef in efs:
                 ef_filter = ef_filter | Q(responses__answer__contains=ef)
            
            # Only for the ecosystem-features question
            ef_filter = ef_filter & Q(responses__question__slug='ecosystem-features')
            
            return semi_filtered.filter(ef_filter)

        else:
            return semi_filtered

    class Meta:

        queryset = Respondant.objects.all().annotate(responses_count=Count("responses")).filter(responses_count__gte=1, complete__exact=True).order_by("-ts")
        #queryset = Respondant.objects.filter(responses_count__gte=1).order_by('-ts')

        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS,
            'user': ALL_WITH_RELATIONS,
            'ts': ['gte','lte']
        }
        ordering = ['-ts']
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()

class IncompleteRespondantResource(ReportRespondantResource):
    class Meta:
        queryset = Respondant.objects.all().annotate(responses_count=Count("responses")).filter(responses_count__gte=1, complete__exact=False).order_by("-ts")
        #queryset = Respondant.objects.filter(responses_count__gte=1).order_by('-ts')
        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS,
            'user': ALL_WITH_RELATIONS,
            'ts': ['gte','lte']
        }
        ordering = ['-ts']
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()


class DashRespondantResource(ReportRespondantResource):
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=True, readonly=True)

class DashRespondantDetailsResource(ReportRespondantResource):
    responses = fields.ToManyField(ResponseResource, 'responses', full=True, null=True, blank=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=True, readonly=True)


class ReportRespondantDetailsResource(ReportRespondantResource):
    responses = fields.ToManyField(ResponseResource, 'responses', full=True, null=True, blank=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=True, readonly=True)
    
class RespondantResource(SurveyModelResource):
    responses = fields.ToManyField(ResponseResource, 'responses', full=True, null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource', 'survey', null=True, blank=True, full=True, readonly=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'user', null=True, blank=True, full=True, readonly=True)

    class Meta:
        queryset = Respondant.objects.all().order_by('-ts')
        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS,
            'ts': ['gte','lte']
        }
        ordering = ['-ts']
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()


class OptionResource(SurveyModelResource):
    class Meta:
        always_return_data = True
        queryset = Option.objects.all().order_by('order');
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




class BlockResource(SurveyModelResource):
    skip_question = fields.ToOneField('apps.survey.api.QuestionResource', 'skip_question', null=True, blank=True)

    class Meta:
        queryset = Block.objects.all()
        always_return_data = True
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()


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
    # pages = fields.ToManyField('apps.survey.api.PageResource', 'page_set', null=True, blank=True)


    class Meta:
        queryset = Question.objects.all()
        always_return_data = True
        authorization = StaffUserOnlyAuthorization()
        authentication = Authentication()
        filtering = {
            'slug': ALL,
            'surveys': ALL_WITH_RELATIONS
        }

    # save_m2m = main_save_m2m

class SurveyResource(SurveyModelResource):
    questions = fields.ToManyField(QuestionResource, 'questions', full=True, null=True, blank=True)
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

class SurveyReportResource(SurveyResource):
    questions = fields.ToManyField(QuestionResource, 'questions', null=True, blank=True)
    num_registered = fields.IntegerField(attribute='num_registered', readonly=True)
    completes = fields.IntegerField(attribute='completes', readonly=True)
    incompletes = fields.IntegerField(attribute='incompletes', readonly=True)
    survey_responses = fields.IntegerField(attribute='survey_responses', readonly=True)
    activity_points = fields.IntegerField(attribute='activity_points', readonly=True)
