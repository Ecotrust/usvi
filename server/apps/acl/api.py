from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie.contrib.contenttypes.fields import GenericForeignKeyField
from tastypie import fields
from .models import AnnualCatchLimit, Species, SpeciesFamily, AREA_CHOICES, SECTOR_CHOICES
from survey.api import SurveyModelResource, StaffUserOnlyAuthorization


class SpeciesResource(SurveyModelResource):

    class Meta:
        ordering = ['name']
        queryset = Species.objects.all().order_by('name')
        authorization = StaffUserOnlyAuthorization()
        filtering = {
            'name': ['icontains'],
        }


class SpeciesFamilyResource(SurveyModelResource):

    class Meta:
        queryset = SpeciesFamily.objects.all().order_by('name')
        authorization = StaffUserOnlyAuthorization()
        filtering = {
            'name': ['icontains'],
        }


class AnnualCatchLimitResource(SurveyModelResource):
    by_species = fields.BooleanField(readonly=True, attribute="by_species")
    species = GenericForeignKeyField({
        Species: SpeciesResource,
        SpeciesFamily: SpeciesFamilyResource
    }, 'species', full=True, null=True)

    def alter_detail_data_to_serialize(self, request, bundle):
        if 'meta' not in bundle.data:
            bundle.data['meta'] = {}

        bundle.data['meta']['area_choices'] = AREA_CHOICES
        bundle.data['meta']['sector_choices'] = SECTOR_CHOICES
        return bundle

    def alter_list_data_to_serialize(self, request, bundle):
        if 'meta' not in bundle:
            bundle['meta'] = {}

        bundle['meta']['area_choices'] = AREA_CHOICES
        bundle['meta']['sector_choices'] = SECTOR_CHOICES
        return bundle

    def get_object_list(self, request):
        objects = super(AnnualCatchLimitResource, self).get_object_list(request)

        user_tags = [tag.name for tag in request.user.profile.tags.all()]
        if 'puerto-rico' not in user_tags:
            objects = objects.exclude(area='puertorico')
        if 'usvi' not in user_tags:
            objects = objects.exclude(area='stcroix')
            objects = objects.exclude(area='stthomasstjohn')
        return objects

    class Meta:
        always_return_data = True
        queryset = AnnualCatchLimit.objects.all()
        authorization = StaffUserOnlyAuthorization()
        filtering = {
            'area': ALL,
        }
