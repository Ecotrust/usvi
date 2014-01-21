from django.db import models
import caching.base
from django.contrib.contenttypes import generic
from django.contrib.contenttypes.models import ContentType


class Dialect(caching.base.CachingMixin, models.Model):
    code = models.CharField(max_length=48, unique=True)
    name = models.CharField(max_length=64)
    description = models.TextField()
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    objects = caching.base.CachingManager()

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Dialects"


class SpeciesFamily(caching.base.CachingMixin, models.Model):
    code = models.CharField(max_length=48, unique=True)
    name = models.CharField(max_length=144)
    description = models.TextField()
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    objects = caching.base.CachingManager()

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Species Families"


class Species(caching.base.CachingMixin, models.Model):
    code = models.CharField(max_length=48, unique=True)
    family = models.ForeignKey('SpeciesFamily')
    erdmans_code = models.CharField(max_length=48)
    name = models.CharField(max_length=144)
    description = models.TextField()
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    objects = caching.base.CachingManager()

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Species"


class DialectSpecies(caching.base.CachingMixin, models.Model):
    dialect = models.ForeignKey('Dialect')
    species = models.ForeignKey('Species')
    name = models.CharField(max_length=144)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    objects = caching.base.CachingManager()

    def __unicode__(self):
        return "%s -> %s" % (self.name, self.species.name)

    @property
    def dialect_name(self):
        return self.dialect.name

    @property
    def species_name(self):
        return "%s (%s)" % (self.species.name, self.species.code)

    class Meta:
        verbose_name_plural = "Dialect Species"

AREA_CHOICES = (
    ('st-croix', 'St. Croix'),
    ('st-thomas-st-john', 'St. Thomas/St. John'),
    ('puerto-rico', 'Puerto Rico'),
    ('us-carib-eez', 'U.S. Caribbean Exclusive Economic Zone'),
)

SECTOR_CHOICES = (
    ('commercial', 'Commercial Sector'),
    ('recreational', 'Recreational Sector'),
)

class AnnualCatchLimit(caching.base.CachingMixin, models.Model):
    content_type = models.ForeignKey(ContentType, null=True)
    object_id = models.PositiveIntegerField(null=True)
    species = generic.GenericForeignKey('content_type', 'object_id')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    sector = models.CharField(max_length=144, null=True, blank=True, choices=SECTOR_CHOICES)
    area = models.CharField(max_length=144, choices=AREA_CHOICES)
    pounds = models.IntegerField(null=True, blank=True)
    number_of_fish = models.IntegerField(null=True, blank=True)

