import datetime
from haystack import indexes
from apps.survey.models import Respondant


class RespondentIndex(indexes.SearchIndex, indexes.Indexable):
    #username = indexes.CharField()
    text = indexes.CharField(document=True, use_template=True)
    ordering_date = indexes.DateTimeField(model_attr='ts')
    

    def get_model(self):
        return Respondant

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated."""
        qs = self.get_model().objects.filter(status='complete').select_related('survey')
        return qs

    def prepare_username(self, obj):
        if obj.user:
            return obj.user.username
        else:
            return None
