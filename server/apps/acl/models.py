from django.db.models import Q
from django.db import models
import caching.base
from django.contrib.contenttypes import generic
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
import re


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

    @classmethod
    def lookup(cls, name, group):
        regex = re.compile('\((.*)\)')
        query = Q(name__iexact=name)
        matches = DialectSpecies.objects.filter(query)
        if len(matches.values('species__name', 'species__code').distinct()) == 1:
            pass
        else:
            if group is not None:
                query = query | Q(name__iexact="%s %s" % (name, group))
                # match things like Jolthead in the Porgies group
                query = query | Q(name__iexact="%s %s" % (name, group.replace('ies', 'y')))
                # match things like Blackhead in the Snappers group
                query = query | Q(name__iexact="%s %s" % (name, group[:-1]))
                # match things like French in the Angelfieshes group
                query = query | Q(name__iexact="%s %s" % (name, group[:-2]))
                paren_name = regex.search(group)
                if paren_name is not None:
                    # matches things like: Queen Silk (Queen)
                    query = query | Q(name__iexact="%s %s" % (name, paren_name.group(1)))
                    query = query | Q(name__iexact="%s %s" % (name, paren_name.group(1)[:-1]))
                    query = query | Q(name__iexact="%s %s" % (name, paren_name.group(1)[:-2]))
                    query = query | Q(name__iexact="%s %s)" % (name[:-1], paren_name.group(1)[:-2]))
                if group.endswith('es'):
                    group = group[:-2]
                    query = query | Q(name__iexact="%s %s" % (name, group))
                elif group.endswith('s'):
                    group = group[:-1]
                    print "%s %s?" % (name, group)
                    query = query | Q(name__iexact="%s %s" % (name, group))
                    print DialectSpecies.objects.filter(query)
                if name.endswith(')'):
                    query = query | Q(name__iexact="%s %s)" % (name[:-1], group))
                    query = query | Q(name__iexact=name.split(' (')[0])
                if group.endswith(')'):
                    query = query | Q(name__iexact="%s %s)" % (name[:-1], group))
            matches = DialectSpecies.objects.filter(query)
        if matches.count() == 0:
            raise ValidationError("'%s' is not a valid species." % (name))
        else:
            species_matches = matches.values('species').distinct()
            if len(species_matches) > 1:
                raise ValidationError("'%s' matches more than one species." % (name))
            else:
                return Species.objects.get(id=species_matches[0]['species'])



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

