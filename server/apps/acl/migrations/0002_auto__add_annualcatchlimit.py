# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'AnnualCatchLimit'
        db.create_table(u'acl_annualcatchlimit', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('start_date', self.gf('django.db.models.fields.DateField')(null=True, blank=True)),
            ('end_date', self.gf('django.db.models.fields.DateField')(null=True, blank=True)),
            ('sector', self.gf('django.db.models.fields.CharField')(max_length=144, null=True, blank=True)),
            ('area', self.gf('django.db.models.fields.CharField')(max_length=144)),
            ('pounds', self.gf('django.db.models.fields.IntegerField')(null=True, blank=True)),
            ('number_of_fish', self.gf('django.db.models.fields.IntegerField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'acl', ['AnnualCatchLimit'])


    def backwards(self, orm):
        # Deleting model 'AnnualCatchLimit'
        db.delete_table(u'acl_annualcatchlimit')


    models = {
        u'acl.annualcatchlimit': {
            'Meta': {'object_name': 'AnnualCatchLimit'},
            'area': ('django.db.models.fields.CharField', [], {'max_length': '144'}),
            'end_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'number_of_fish': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'pounds': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'sector': ('django.db.models.fields.CharField', [], {'max_length': '144', 'null': 'True', 'blank': 'True'}),
            'start_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'})
        },
        u'acl.dialect': {
            'Meta': {'object_name': 'Dialect'},
            'code': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '48'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '64'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'null': 'True', 'blank': 'True'})
        },
        u'acl.dialectspecies': {
            'Meta': {'object_name': 'DialectSpecies'},
            'dialect': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['acl.Dialect']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '144'}),
            'species': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['acl.Species']"}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'null': 'True', 'blank': 'True'})
        },
        u'acl.species': {
            'Meta': {'object_name': 'Species'},
            'code': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '48'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            'erdmans_code': ('django.db.models.fields.CharField', [], {'max_length': '48'}),
            'family': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['acl.SpeciesFamily']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '144'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'null': 'True', 'blank': 'True'})
        },
        u'acl.speciesfamily': {
            'Meta': {'object_name': 'SpeciesFamily'},
            'code': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '48'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '144'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'null': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['acl']