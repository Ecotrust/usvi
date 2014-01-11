# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'Dialect'
        db.create_table(u'acl_dialect', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('code', self.gf('django.db.models.fields.CharField')(unique=True, max_length=48)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=64)),
            ('description', self.gf('django.db.models.fields.TextField')()),
            ('updated_at', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, null=True, blank=True)),
        ))
        db.send_create_signal(u'acl', ['Dialect'])

        # Adding model 'SpeciesFamily'
        db.create_table(u'acl_speciesfamily', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('code', self.gf('django.db.models.fields.CharField')(unique=True, max_length=48)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=144)),
            ('description', self.gf('django.db.models.fields.TextField')()),
            ('updated_at', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, null=True, blank=True)),
        ))
        db.send_create_signal(u'acl', ['SpeciesFamily'])

        # Adding model 'Species'
        db.create_table(u'acl_species', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('code', self.gf('django.db.models.fields.CharField')(unique=True, max_length=48)),
            ('family', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['acl.SpeciesFamily'])),
            ('erdmans_code', self.gf('django.db.models.fields.CharField')(max_length=48)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=144)),
            ('description', self.gf('django.db.models.fields.TextField')()),
            ('updated_at', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, null=True, blank=True)),
        ))
        db.send_create_signal(u'acl', ['Species'])

        # Adding model 'DialectSpecies'
        db.create_table(u'acl_dialectspecies', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('dialect', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['acl.Dialect'])),
            ('species', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['acl.Species'])),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=144)),
            ('updated_at', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, null=True, blank=True)),
        ))
        db.send_create_signal(u'acl', ['DialectSpecies'])


    def backwards(self, orm):
        # Deleting model 'Dialect'
        db.delete_table(u'acl_dialect')

        # Deleting model 'SpeciesFamily'
        db.delete_table(u'acl_speciesfamily')

        # Deleting model 'Species'
        db.delete_table(u'acl_species')

        # Deleting model 'DialectSpecies'
        db.delete_table(u'acl_dialectspecies')


    models = {
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