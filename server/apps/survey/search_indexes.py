import datetime
from haystack import indexes
from .models import Respondant


class RespondentIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    user = indexes.CharField(model_attr='user', null=True)
    ordering_date = indexes.DateTimeField(model_attr='ordering_date')

    def get_model(self):
        return Respondant

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.filter(ordering_date__lte=datetime.datetime.now())