from django.utils.text import slugify
from ordereddict import OrderedDict
import simplejson


class CsvFieldGenerator(object):


    @staticmethod
    def get_field_names_for_respondent():
        return OrderedDict((
            ('model-uuid', 'UUID'),
            ('model-timestamp', 'Date of survey'),
            ('model-complete', 'Complete'),
            ('model-email', 'Email'),
            ('model-review-status', 'Review Status'),
        ))


    @staticmethod
    def get_flat_dict_for_respondent(respondent, survey):
        flat = {
            'model-uuid': respondent.uuid,
            'model-timestamp': str(respondent.ts),
            'model-complete': respondent.complete,
            'model-email': respondent.surveyor.email if hasattr(respondent, 'surveyor') else '',
            # 'first-name': respondent.user.first_name if respondent.user is not None else '',
            # 'last-name': respondent.user.last_name if respondent.user is not None else '',
            'model-review-status': respondent.get_review_status_display(),
        }
        survey_questions = survey.questions.all()
        responses = respondent.response_set.filter(question__in=survey_questions).select_related('question')
        for response in responses:
            flat_response = CsvFieldGenerator.get_flat_dict_for_response(response)
            if flat_response is not None:
                flat.update(flat_response)
        return flat


    @staticmethod
    def get_field_names_for_question_set(questions, respondent_set):
        fields = OrderedDict()
        for qu in questions:
            field_names = CsvFieldGenerator.get_field_names_for_question(qu, respondent_set)
            if field_names is not None:
                fields = OrderedDict(fields.items() + field_names.items())
        return fields


    @staticmethod
    def get_field_names_for_question(question, respondent_set):
        """ Provide a field name dict entry for the given question.
        
        param: question - the question to produce a dict of field name(s)
        
        param: respondent_set - used to filter down to only responses which are 
        provided by the set of respondents to be included in the export. Otherwise, 
        there is potential for unneccesary extra columns that are empty.
        """
        qu = question
        field_names = OrderedDict()

        if qu.type in ('number-with-unit'):
            field_names[qu.slug] = qu.slug + ' :: ' + qu.label
            field_names[qu.slug + '-unit'] = qu.slug + ' :: ' + qu.label + ' Unit'

        elif qu.type == 'grid':
            rows = (qu.response_set
                     .exclude(gridanswer__row_label__isnull=True)
                     .filter(respondant__in=respondent_set)
                     .values_list('gridanswer__row_label',
                                  'gridanswer__row_text',
                                  'gridanswer__col_label', 
                                  'gridanswer__col_text')
                     .distinct()
                     .order_by('gridanswer__row_label', 'gridanswer__col_label'))
            for row_slug, row_text, col_slug, col_text in rows:
                field_names[qu.slug + '-' + row_slug + '-' + col_slug] = qu.slug + ' :: ' + qu.label + ' - ' + row_text + ' - ' + col_text
        
        elif qu.type in ('single-select', 'multi-select'):
            # Break each selected option into its own column with 1 signifying selected. 
            if qu.type == 'multi-select':
                from models import MultiAnswer
                selected_options = (MultiAnswer.objects
                     .filter(response__question__slug=qu.slug)
                     .filter(response__respondant__in=respondent_set)
                     .exclude(is_other=True)
                     .values_list('answer_text')
                     .distinct()
                     .order_by('answer_text'))
                for option_text, in selected_options:
                    field_names[qu.slug + '-' + slugify(option_text)] = qu.slug + ' :: ' + qu.label + ' - ' + option_text
            elif qu.type == 'single-select':
                selected_options = (qu.response_set
                     .filter(respondant__in=respondent_set)
                     .exclude(is_other=True)
                     .values_list('answer')
                     .distinct()
                     .order_by('answer'))
                for option_text, in selected_options:
                    field_names[qu.slug + '-' + slugify(option_text)] = qu.slug + ' :: ' + qu.label + ' - ' + option_text
            if qu.allow_other and selected_options.count() > 0:
                # All Others will go into a single cell per response.
                field_names[qu.slug + '-other'] = qu.slug + ' :: ' + qu.label + ' - Other'
        elif qu.type != 'info':
            field_names[qu.slug] = qu.slug + ' :: ' + qu.label
        
        # for k, v in field_names:
        #     field_names[k] = v.encode('utf-8')

        return field_names

    @staticmethod
    def get_flat_dict_for_response(response):
        if response.question.type in ('info', 'map-multipoint', 'location', 'pennies'):
            # These question types not yet tended to. The 'info' type,
            # is intentionally not exported because there is no answer 
            # to provide.
            return None

        if response.question.slug[:6] in ('area-3', 'area-2'):
            # Ignoring responses provided for old questions.
            return None

        flat = {}
        if response.answer_raw:
            if response.question.type in ('text', 'textarea', 'yes-no', 'timepicker',
                                            'datepicker', 'monthpicker', 'timepicker', 
                                            'map-multipolygon'):
                flat[response.question.slug] = response.answer
            
            elif response.question.type in ('number-with-unit'):
                flat[response.question.slug] = response.answer
                flat[response.question.slug + '-unit'] = response.unit
            
            elif response.question.type in ('currency', 'integer', 'number'):
                flat[response.question.slug] = str(response.answer)
            
            elif response.question.type == 'grid':
                for answer in response.gridanswer_set.all():
                    flat[response.question.slug + '-' + answer.row_label + '-' + answer.col_label] = answer.answer_text

            elif response.question.type in ('auto-single-select', 'single-select', 
                                            'auto-multi-select', 'multi-select'):
                
                if response.question.type in ('auto-single-select', 'single-select'):
                    response.answer_text = response.answer
                    answers = [response]
                else:
                    answers = response.multianswer_set.all()
                for answer in answers:
                    answer_text = answer.answer_text
                    if answer.is_other:
                        # Put all Other answers into a single column cell.
                        answer_text = answer.answer_text
                        other_key = response.question.slug + '-other'
                        if flat.has_key(other_key) and flat[other_key]:
                            flat[other_key] = flat[other_key] + '; ' + answer_text
                        else:
                            flat[other_key] = answer_text
                    else:
                        # Make a column for each non-Other answer with 1 signifying selected. 
                        flat[response.question.slug + '-' + slugify(answer_text)] = 1

            else:
                raise NotImplementedError(
                    ('Found unknown question type of {0} while processing '
                     'response id {1}').format(response.question.type, response.id)
                )

        return flat
