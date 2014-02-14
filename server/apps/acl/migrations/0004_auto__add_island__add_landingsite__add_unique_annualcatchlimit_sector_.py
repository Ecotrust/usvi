# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'Island'
        db.create_table(u'acl_island', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('code', self.gf('django.db.models.fields.CharField')(unique=True, max_length=48)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=64)),
        ))
        db.send_create_signal(u'acl', ['Island'])

        # Adding model 'LandingSite'
        db.create_table(u'acl_landingsite', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('code', self.gf('django.db.models.fields.CharField')(unique=True, max_length=48)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=64)),
            ('county', self.gf('django.db.models.fields.CharField')(max_length=64)),
            ('island', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['acl.Island'])),
        ))
        db.send_create_signal(u'acl', ['LandingSite'])

        # Adding unique constraint on 'AnnualCatchLimit', fields ['sector', 'end_date', 'area', 'object_id', 'content_type', 'start_date']
        db.create_unique(u'acl_annualcatchlimit', ['sector', 'end_date', 'area', 'object_id', 'content_type_id', 'start_date'])


    def backwards(self, orm):
        # Removing unique constraint on 'AnnualCatchLimit', fields ['sector', 'end_date', 'area', 'object_id', 'content_type', 'start_date']
        db.delete_unique(u'acl_annualcatchlimit', ['sector', 'end_date', 'area', 'object_id', 'content_type_id', 'start_date'])

        # Deleting model 'Island'
        db.delete_table(u'acl_island')

        # Deleting model 'LandingSite'
        db.delete_table(u'acl_landingsite')


    models = {
        u'acl.annualcatchlimit': {
            'Meta': {'ordering': "['content_type', 'object_id', 'area', 'start_date', 'end_date']", 'unique_together': "(('content_type', 'object_id', 'start_date', 'end_date', 'area', 'sector'),)", 'object_name': 'AnnualCatchLimit'},
            'area': ('django.db.models.fields.CharField', [], {'max_length': '144'}),
            'content_type': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['contenttypes.ContentType']", 'null': 'True'}),
            'end_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'number_of_fish': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'object_id': ('django.db.models.fields.PositiveIntegerField', [], {'null': 'True'}),
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
        u'acl.island': {
            'Meta': {'object_name': 'Island'},
            'code': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '48'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '64'})
        },
        u'acl.landingsite': {
            'Meta': {'object_name': 'LandingSite'},
            'code': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '48'}),
            'county': ('django.db.models.fields.CharField', [], {'max_length': '64'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'island': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['acl.Island']"}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '64'})
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
        },
        u'contenttypes.contenttype': {
            'Meta': {'ordering': "('name',)", 'unique_together': "(('app_label', 'model'),)", 'object_name': 'ContentType', 'db_table': "'django_content_type'"},
            'app_label': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'model': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        }
    }

    complete_apps = ['acl']