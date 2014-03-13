import datetime
from haystack import indexes
from .models import Respondant


class RespondentIndex(indexes.SearchIndex, indexes.Indexable):
    survey_tags = indexes.CharField()
    entered_by = indexes.CharField()
    island = indexes.CharField(model_attr="island", null=True)
    review_status = indexes.CharField(model_attr='review_status')
    text = indexes.CharField(document=True, use_template=True)
    ordering_date = indexes.DateTimeField(model_attr='ordering_date')

    def get_model(self):
        return Respondant

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.filter(ordering_date__lte=datetime.datetime.now()).select_related('survey')

    def prepare_survey_tags(self, obj):
        tags = [tag.name for tag in obj.survey.tags.all()]
        return " ".join(tags)

    def prepare_entered_by(self, obj):
        if obj.entered_by:
            return obj.entered_by.username
        else:
            return None
