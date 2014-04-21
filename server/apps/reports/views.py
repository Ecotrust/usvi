from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Max, Min, Count, Sum
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.decorators import login_required
from djgeojson.views import GeoJSONLayerView
from djgeojson.serializers import Serializer as GeoJSONSerializer

import simplejson
import datetime

from apps.survey.models import (Survey, Question, Response, Respondant, Location,
                                MultiAnswer, LocationAnswer, GridAnswer, REVIEW_STATE_ACCEPTED)
from apps.places.models import Area
from apps.reports.models import QuestionReport


def get_respondants_summary(request):
    """
    """
    start_time = Respondant.objects.filter(user=request.user).aggregate(lowest=Min('ordering_date'))['lowest']
    return HttpResponse(simplejson.dumps( { 'start_time': start_time.strftime('%Y-%m-%d') } ) )

@login_required
def get_geojson(request, survey_slug, question_slug):
    survey = get_object_or_404(Survey, slug=survey_slug)
    question = get_object_or_404(QuestionReport, slug=question_slug, survey=survey)
    locations = LocationAnswer.objects.filter(location__response__respondant__survey=survey, location__respondant__complete=True)

    filter_list = []
    filters = None

    if request.GET:
        filters = request.GET.get('filters', None)

    if filters is not None:
        filter_list = simplejson.loads(filters)

    if filters is not None:
        for filter in filter_list:
            slug = filter.keys()[0]
            value = filter[slug]
            filter_question = QuestionReport.objects.get(slug=slug, survey=survey)
            locations = locations.filter(location__respondant__response_set__in=filter_question.response_set.filter(answer__in=value))

    geojson = [];
    for location in locations:
        d = {
            'type': "Feature",
            'properties': {
                'activity': location.answer,
                'label': location.label
            },
            'geometry': {
                'type': "Point",
                'coordinates': [location.location.lng,location.location.lat]
            }
        }
        geojson.append(d)
    return HttpResponse(simplejson.dumps({'success': "true", 'geojson': geojson}))


@login_required
def get_distribution(request, survey_slug, question_slug):
    """

    Request Params:
    - start_date [String] - ISO 8601 date stamp yyyy-mm-dd
    - end_date [String] - ISO 8601 date stamp yyyy-mm-dd
    - fisher [String] - if present only returns the logged in users data
    - accepted - if present filters respondants on REVIEW_STATE_ACCEPTED

    Returns a list JSON dict with keywords 'success' and 'results'. If the user is not staff or
    the 'fisher' param is present only returns data for the logged in user.

    """
    if request.method == 'GET':
        filters = request.GET.get('filters', None)
        start_date = request.GET.get('start_date', None)
        end_date = request.GET.get('end_date', None)
        island = request.GET.get('island', None)

    if survey_slug == 'all':
        user_tags = [tag.name for tag in request.user.profile.tags.all()]
        surveys = Survey.objects.filter(tags__name__in=user_tags)
    else:
        surveys = Survey.objects.filter(slug=survey_slug)

    if question_slug.find('*') == -1:
        question = get_object_or_404(QuestionReport, slug=question_slug, question_page__survey__in=surveys)
        answers = question.response.filter(respondant__complete=True)
        question_type = question.type
    else:
        questions = Question.objects.filter(slug__icontains=question_slug.replace('*', ''), question_page__survey__in=surveys)
        if questions.count() == 0:
            return HttpResponse(simplejson.dumps({'success': "true",
                                                  "results": []}))
        answers = Response.objects.filter(question__in=questions)
        question_type = questions.values('type').distinct()[0]['type']

    if request.user.is_staff is False or request.GET.get('fisher', None) is not None:
        answers = answers.filter(user=request.user)
    elif request.GET.get('accepted', None) is not None:
        answers = answers.filter(respondant__review_status=REVIEW_STATE_ACCEPTED)

    filter_list = []


    if filters is not None:
        filter_list = simplejson.loads(filters)
    else:
        filter_question = None
    if start_date is not None:
        start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d') - datetime.timedelta(days=1)
        answers = answers.filter(respondant__ordering_date__gte=start_date)

    if end_date is not None:
        end_date = datetime.datetime.strptime(end_date, '%Y-%m-%d') + datetime.timedelta(days=1)
        answers = answers.filter(respondant__ordering_date__lte=end_date)

    if island is not None:
        answers = answers.filter(respondant__island=island.replace('|', '&'))

    if question_type in ['map-multipoint']:
        locations = LocationAnswer.objects.filter(location__response__in=answers)

    if filters is not None:
        for filter_slug in filter_list.keys():
            value = filter_list[filter_slug].replace('|', '&')
            filter_question = QuestionReport.objects.get(slug=filter_slug, question_page__survey__in=surveys)
            if question_type in ['map-multipoint']:
                if filter_question == self:
                    locations = locations.filter(answer__in=value)
                else:
                    answers = answers.filter(respondant__response_set__in=filter_question.response_set.filter(answer__in=value))
                    locations = locations.filter(location__response__in=answers)
            else:
                if not isinstance(value, (list, tuple)):
                    value = [value]
            answers = answers.filter(respondant__response__in=filter_question.response_set.filter(answer__in=value))
    if question_type in ['grid']:
        # print GridAnswer.objects.filter(response__in=answers).values('row_text', 'col_text', 'sp').annotate(total=Sum('answer_number')).order_by('row_text')

        answer_domain = GridAnswer.objects.filter(response__in=answers).values('species__name', 'species__family__name', 'species__code', 'species__family__code').annotate(total=Sum('answer_number')).order_by('species__name')
        # return answers.values('answer').annotate(locations=Sum('respondant__locations'), surveys=Count('answer'))
    elif question_type in ['map-multipoint']:
        answer_domain = locations.values('answer').annotate(locations=Count('answer'), surveys=Count('location__respondant', distinct=True))
    elif question_type in ['map-multipolygon']:
        #answer_domain = answers.values('answer')
        answer_domain = MultiAnswer.objects.filter(response__in=answers).exclude(area=None)
        areas = Area.objects.filter(multianswer__in=answer_domain).values('geom', 'id').distinct()
        return HttpResponse(GeoJSONSerializer().serialize(areas, use_natural_keys=True))
        # print MultiAnswer.objects.filter(response__in=answers).exclude(area=None).values('area')
    else:
        answer_domain = answers.values('answer')

    return HttpResponse(simplejson.dumps({'success': "true", "results": list(answer_domain)}))

@staff_member_required
def get_crosstab(request, survey_slug, question_a_slug, question_b_slug):
    start_date = request.GET.get('startdate', None)
    end_date = request.GET.get('enddate', None)
    group = request.GET.get('group', None)
    try:
        if start_date is not None:
            start_date = datetime.datetime.strptime(start_date, '%Y%m%d') - datetime.timedelta(days=1)

        if end_date is not None:
            end_date = datetime.datetime.strptime(end_date, '%Y%m%d') + datetime.timedelta(days=1)

        survey = Survey.objects.get(slug = survey_slug)

        question_a = Question.objects.get(slug = question_a_slug, survey=survey)
        question_b = Question.objects.get(slug = question_b_slug, survey=survey)
        date_question = Question.objects.get(slug = 'survey-date', survey=survey)
        question_a_responses = Response.objects.filter(question=question_a)

        if start_date is not None and end_date is not None:
            question_a_responses = question_a_responses.filter(respondant__ts__lte=end_date, respondant__ts__gte=start_date)
        crosstab = []
        obj = {}
        values_count = 0

        for question_a_answer in question_a_responses.order_by('answer').values('answer').distinct():
            respondants = Respondant.objects.all()

            if start_date is not None and end_date is not None:
                #respondants = respondants.filter(responses__in=date_question.response_set.filter(answer_date__gte=start_date))
                respondants = respondants.filter(ts__lte=end_date, ts__gte=start_date)

            respondants = respondants.filter(response_set__in=question_a_responses.filter(answer=question_a_answer['answer']))

            # if end_date is not None:
            #     #respondants = respondants.filter(respondantsesponses__in=date_question.response_set.filter(answer_date__lte=end_date))


            if question_b.type in ['grid']:
                obj['type'] = 'stacked-column'
                rows = Response.objects.filter(respondant__in=respondants, question=question_b)[0].gridanswer_set.all().values('row_text','row_label').order_by('row_label')
                obj['seriesNames'] = [row['row_text'] for row in rows]
                crosstab.append({
                    'name': question_a_answer['answer'],
                    'value': list(rows.annotate(average=Avg('answer_number')))
                })
            elif question_b.type in ['currency', 'integer', 'number']:
                if group is None:
                    obj['type'] = 'bar-chart'
                    d = {
                        'name': question_a_answer['answer'],
                        'value': Response.objects.filter(respondant__in=respondants, question=question_b).aggregate(sum=Sum('answer_number'))['sum']
                    }
                else:
                    obj['type'] = 'time-series'
                    values = Response.objects.filter(respondant__in=respondants, question=question_b).extra(select={ 'date': "date_trunc('%s', ts)" % group}).order_by('date').values('date').annotate(sum=Sum('answer_number'))

                    d = {
                        'name': question_a_answer['answer'],
                        'value': list(values)
                    }

                crosstab.append(d)

            obj['crosstab'] = crosstab
            obj['success'] = 'true'
        return HttpResponse(json.dumps(obj, cls=DjangoJSONEncoder))
    except Exception, err:
        print Exception, err
        return HttpResponse(json.dumps({'success': False, 'message': "No records for this date range." }))


class MapLayer(GeoJSONLayerView):
    # Options
    precision = 4   # float
    simplify = 0.5  # generalization
    srid = None