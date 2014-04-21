# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Changing field 'ErrorEntry.message'
        db.alter_column(u'tracekit_errorentry', 'message', self.gf('django.db.models.fields.TextField')())

    def backwards(self, orm):

        # Changing field 'ErrorEntry.message'
        db.alter_column(u'tracekit_errorentry', 'message', self.gf('django.db.models.fields.CharField')(max_length=255))

    models = {
        u'tracekit.errorentry': {
            'Meta': {'ordering': "('-timestamp',)", 'object_name': 'ErrorEntry'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'message': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'stack_info': ('django.db.models.fields.TextField', [], {}),
            'timestamp': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now', 'db_index': 'True'})
        }
    }

    complete_apps = ['tracekit']