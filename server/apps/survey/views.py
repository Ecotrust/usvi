# Create your views here.
from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext, Context
from django.shortcuts import get_object_or_404
from django.template.loader import get_template
from django.core.mail import EmailMultiAlternatives
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib.auth.models import User
from django.core.serializers.json import DjangoJSONEncoder

import datetime
import json

from apps.survey.models import *

@staff_member_required
def delete_responses(request, uuid, template='survey/delete.html'):
    respondant = get_object_or_404(Respondant, uuid=uuid)
    for response in respondant.response_set.all():
        response.delete()
    respondant.response_set.clear()
    respondant.save()
    return render_to_response(template, RequestContext(request, {}))

def survey(request, survey_slug=None, template='survey/survey.html'):
    if survey_slug is not None:
        survey = get_object_or_404(Survey, slug=survey_slug, anon=True)
        if request.user.is_staff:
            survey_user = request.GET.get('user', None)
            if survey_user is not None:
                user = get_object_or_404(User, username=survey_user)
                respondant = Respondant(survey=survey, user=user, entered_by=request.user)
        else:
            respondant = Respondant(survey=survey)
        respondant.save()
        if request.GET.get('get-uid', None) is not None:
            return HttpResponse(json.dumps({'success': "true", "uuid": respondant.uuid}))
        return redirect("/respond#/survey/%s/1/%s" % (survey.slug, respondant.uuid))
    context = {'ANALYTICS_ID': settings.ANALYTICS_ID}
    return render_to_response(template, RequestContext(request, context))


def survey_details(user):
    user_tags = [tag.name for tag in user.profile.tags.all()]
    surveys = Survey.objects.filter(tags__name__in=user_tags)
    all_respondents = Respondant.objects.filter(survey__in=surveys)
    entered_by = [u['entered_by__username'] for u in all_respondents.exclude(entered_by=None).values('entered_by__username').distinct()]
    return {
        "total": all_respondents.count(),
        "needs_review": all_respondents.filter(review_status=REVIEW_STATE_NEEDED).count(),
        "flagged": all_respondents.filter(review_status=REVIEW_STATE_FLAGGED).count(),
        "reports_start": all_respondents.aggregate(lowest=Min('ordering_date'), highest=Max('ordering_date'))['lowest'],
        "reports_end": all_respondents.aggregate(lowest=Min('ordering_date'), highest=Max('ordering_date'))['highest'],
        "entered_by": entered_by
    }


@staff_member_required
def get_survey_details(request):
    survey_data = survey_details(request.user)
    return HttpResponse(json.dumps({"meta": survey_data}, cls=DjangoJSONEncoder))


@staff_member_required
def dash(request, template='survey/dash.html'):
    survey_data = survey_details(request.user)
    survey_data['entered_by'] = json.dumps(survey_data['entered_by'])
    return render_to_response(template, RequestContext(request, {"meta": survey_data}))


@login_required
def fisher(request, uuid=None, template='survey/fisher-dash.html'):
    if uuid is None:
        respondents = Respondant.objects.all().order_by('-ts')
        if not request.user.is_staff:
            respondents = respondents.filter(user=request.user)
        return render_to_response(template, RequestContext(request, {'respondents': respondents}))
    else:
        respondent = Respondant.objects.get(uuid=uuid)
        template='survey/fisher-detail.html'
        return render_to_response(template, RequestContext(request, {'respondent': respondent}))
    


def submit_page(request, survey_slug, uuid): #, survey_slug, question_slug, uuid):
    if request.method == 'POST':
        survey = get_object_or_404(Survey, slug=survey_slug)
        respondant = get_object_or_404(Respondant, uuid=uuid)
        
        if respondant.complete is True and not request.user.is_staff:
            return HttpResponse(json.dumps({'success': False, 'complete': True}))

        answers = json.loads(request.body)

        for answerDict in answers.get('answers', []):
            answer = answerDict['answer']
            question_slug = answerDict['slug']
            
            question = get_object_or_404(Question, slug=question_slug, question_page__survey=survey)
            response, created = Response.objects.get_or_create(question=question,respondant=respondant)
            response.answer_raw = json.dumps(answer)
            response.ts = datetime.datetime.now()
            if request.user.is_authenticated():
                response.user = request.user
            response.save_related()

            if created:
                respondant.response_set.add(response)

        if request.user.is_authenticated() and not respondant.user:
            respondant.user = request.user
            response.user = request.user
            respondant.user = request.user

        respondant.last_question = question_slug
        respondant.save()

        return HttpResponse(json.dumps({'success': True }))
    return HttpResponse(json.dumps({'success': False}))



def answer(request, survey_slug, question_slug, uuid): #, survey_slug, question_slug, uuid):
    if request.method == 'POST':

        survey = get_object_or_404(Survey, slug=survey_slug)
        question = get_object_or_404(Question, slug=question_slug, survey=survey)
        respondant = get_object_or_404(Respondant, uuid=uuid)
        if respondant.complete is True and not request.user.is_staff:
            return HttpResponse(json.dumps({'success': False, 'complete': True}))

        response, created = Response.objects.get_or_create(question=question,respondant=respondant)
        response.answer_raw = json.dumps(json.loads(request.POST.keys()[0]).get('answer', None))
        response.save_related()

        if created:
            respondant.response_set.add(response)
        if request.user and not respondant.user:
            respondant.user = request.user
            response.user = request.user
        respondant.last_question = question_slug
        respondant.save()
        return HttpResponse(json.dumps({'success': "%s/%s/%s" % (survey_slug, question_slug, uuid)}))
    return HttpResponse(json.dumps({'success': False}))


def complete(request, survey_slug, uuid, action=None, question_slug=None):
    if request.method == 'POST':
        survey = get_object_or_404(Survey, slug=survey_slug)
        respondant = get_object_or_404(Respondant, uuid=uuid, survey=survey)
        print action, question_slug

        if action is None and question_slug is None:
            respondant.complete = True
            respondant.status = 'complete'
        elif action == 'terminate' and question_slug is not None:
            respondant.complete = False
            respondant.status = 'terminate'
            respondant.last_question = question_slug
        respondant.save()
        return HttpResponse(json.dumps({'success': True}))
    return HttpResponse(json.dumps({'success': False}))

def send_email(email, uuid):
    from django.contrib.sites.models import Site

    current_site = Site.objects.get_current()
    
    plaintext = get_template('survey/email.txt')
    htmly = get_template('survey/email.html')

    d = Context({
        'uuid': uuid,
        'SITE_URL': current_site.domain
        })

    subject, from_email, to = 'Take The Survey', 'Coastal Recreation Survey <surveysupport@surfrider.org>', email
    text_content = plaintext.render(d)
    html_content = htmly.render(d)

    msg = EmailMultiAlternatives(subject, text_content, from_email, [to])
    msg.attach_alternative(html_content, "text/html")
    msg.send()

@csrf_exempt
def register(request, template='survey/register.html'):
    if request.POST:
        # create respondant record
        email = request.POST.get('emailAddress', None)
        survey_slug = request.POST.get('survey', None)
        if email is not None:
            survey = get_object_or_404(Survey, slug=survey_slug)
            respondant, created = Respondant.objects.get_or_create(email=email, survey=survey)
            send_email(respondant.email, respondant.uuid)
            return render_to_response('survey/thankyou.html', RequestContext(request, {}))

    return render_to_response(template, RequestContext(request, {}))
