from django.utils.text import slugify
from ordereddict import OrderedDict
import simplejson

# get_field_names_for_respondent(respondent)
# get_field_names_for_survey(survey)
# get_field_names_for_question_set(questions)
# get_field_names_for_question(question)

# get_flat_dict_for_respondent(respondent)
# get_flat_dict_for_response(response)


class CsvFieldGenerator(object):


    @staticmethod
    def get_field_names_for_respondent():
        return OrderedDict((
            ('model-uuid', 'UUID'),
            ('model-surveyor', 'Surveyor'),
            ('model-timestamp', 'Date of survey'),
            ('model-email', 'Email'),
            ('model-complete', 'Complete'),
            ('model-review-status', 'Review Status'),
        ))


    @staticmethod
    def get_flat_dict_for_respondent(respondent):
        flat = {
            'model-uuid': respondent.uuid,
            'model-surveyor': respondent.surveyor.get_full_name() if respondent.surveyor else '',
            'model-timestamp': str(respondent.ts),
            'model-email': respondent.surveyor.email if respondent.surveyor else '',
            'model-complete': respondent.complete,
            'model-review-status': respondent.get_review_status_display(),
        }
        for response in respondent.response_set.all().select_related('question'):
            if response.question.type != 'info':
                flat.update(CsvFieldGenerator.get_flat_dict_for_response(response))
        return flat


    @staticmethod
    def get_field_names_for_survey(survey):
        questions = survey.questions.all().order_by('order')
        return CsvFieldGenerator.get_field_names_for_question_set(questions)


    @staticmethod
    def get_field_names_for_question_set(questions):
        fields = OrderedDict()
        for qu in questions:
            field_names = CsvFieldGenerator.get_field_names_for_question(qu)
            if field_names is not None:
                fields = OrderedDict(fields.items() + field_names.items())
        return fields


    @staticmethod
    def get_field_names_for_question(question):
        """ Depending on the question type, multiple column headings
        may be needed per question. 
        """
        qu = question
        field_names = OrderedDict()

        if qu.type == 'grid':
            rows = (qu.response_set
                     .exclude(gridanswer__row_label__isnull=True)
                     .values_list('gridanswer__row_label',
                                  'gridanswer__row_text',
                                  'gridanswer__col_label', 
                                  'gridanswer__col_text')
                     .distinct()
                     .order_by('gridanswer__row_label', 'gridanswer__col_label'))
            for row_slug, row_text, col_slug, col_text in rows:
                field_names[qu.slug + '-' + row_slug + '-' + col_slug] = qu.label + ' - ' + row_text + ' - ' + col_text
        
        elif qu.type in ('single-select', 'multi-select'):
            # Break each selected option into its own column with 1 signifying selected. 
            if qu.allow_other:
                # All Others will go into a single cell per response.
                field_names[qu.slug + '-other'] = qu.label + ' - Other'
            if qu.type == 'multi-select':
                from models import MultiAnswer
                selected_options = (MultiAnswer.objects.filter(response__question__slug=qu.slug)
                     .exclude(is_other=True)
                     .values_list('answer_text')
                     .distinct()
                     .order_by('answer_text'))
                for option_text, in selected_options:
                    field_names[qu.slug + '-' + slugify(option_text)] = qu.label + ' - ' + option_text
            elif qu.type == 'single-select':
                selected_options = (qu.response_set
                     .exclude(is_other=True)
                     .values_list('answer')
                     .distinct()
                     .order_by('answer'))
                for option_text, in selected_options:
                    field_names[qu.slug + '-' + slugify(option_text)] = qu.label + ' - ' + option_text
        elif qu.type != 'info':
            field_names[qu.slug] = qu.label
        
        return field_names


    @staticmethod
    def get_flat_dict_for_response(response):
        flat = {}
        if response.answer_raw:
            if response.question.type in ('text', 'textarea', 'yes-no',
                                      'map-multipoint', 'pennies', 'timepicker'):
                flat[response.question.slug] = response.answer
            elif response.question.type in ('currency', 'integer', 'number'):
                flat[response.question.slug] = str(response.answer_number)
            elif response.question.type == 'datepicker':
                date = response.answer_date
                flat[response.question.slug] = response.answer_date.strftime(ISO_DATE_FORMAT)
            elif response.question.type == 'grid':
                for answer in response.gridanswer_set.all():
                    flat[response.question.slug + '-' + answer.row_label + '-' + answer.col_label] = answer.answer_text
            elif response.question.type in ('auto-single-select', 'single-select'):
                answer = simplejson.loads(response.answer_raw)
                if answer.get('name'):
                    answer_text = answer['name'].strip()
                elif answer.get('text'):
                    answer_text = answer['text'].strip()

                if answer.has_key('other') and answer['other']:
                    # Put all Other answers into a single column cell.
                    answer_text = "[Other]" + answer_text
                    other_key = response.question.slug + '-other'
                    if flat.has_key(other_key) and flat[other_key]:
                        flat[other_key] = flat[other_key] + '; ' + answer_text
                    else:
                        flat[other_key] = answer_text
                else:
                    flat[response.question.slug + '-' + slugify(answer_text)] = 1

            elif response.question.type in ('auto-multi-select', 'multi-select'):
                for answer in simplejson.loads(response.answer_raw):
                    if answer.get('name'):
                        answer_text = answer['name'].strip()
                    elif answer.get('text'):
                        answer_text = answer['text'].strip()
                    

                    if answer.has_key('other') and answer['other']:
                        # Put all Other answers into a single column cell.
                        answer_text = "[Other]" + answer_text
                        other_key = response.question.slug + '-other'
                        if flat.has_key(other_key) and flat[other_key]:
                            flat[other_key] = flat[other_key] + '; ' + answer_text
                        else:
                            flat[other_key] = answer_text
                    else:
                        # Make a column for each non-Other answer with 1 signifying selected. 
                        flat[response.question.slug + '-' + slugify(answer_text)] = 1

            elif response.question.type == 'info':
                pass
            else:
                raise NotImplementedError(
                    ('Found unknown question type of {0} while processing '
                     'response id {1}').format(response.question.type, response.id)
                )
        return flat     
