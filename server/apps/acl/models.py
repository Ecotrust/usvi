from django.db.models import Q
from django.db import models
import caching.base
from django.contrib.contenttypes import generic
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
import re


class Island(caching.base.CachingMixin, models.Model):
    code = models.CharField(max_length=48, unique=True)
    name = models.CharField(max_length=64)
    objects = caching.base.CachingManager()

class LandingSite(caching.base.CachingMixin, models.Model):
    code = models.CharField(max_length=48, unique=True)
    name = models.CharField(max_length=64)
    county = models.CharField(max_length=64)
    island = models.ForeignKey('Island')
    objects = caching.base.CachingManager()

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

species_mapping = {
    "barjack": "bar jack",
    "blackfin": None,
    "bluestriped": None,
    "bunt tail (mutton)": "bunt tail (mutton snapper)",
    "butterfish": "butterfish (coney)",
    "caesar": "caesar grunt",
    "ceasar": "caesar grunt",
    "cardinal": "cardinal snapper",
    "cooney": "butterfish (coney)",
    "doctofish": "brown doctor (doctorfish)",
    "file fish": "filefish",
    "file fishp": "filefish",
    "french": None,
    "french angel": "french angelfish",
    "grammanik (yellowfin)": "grammanik (yellowfin grouper)",
    "green moray": "green moray eel",
    "hog fish": "hogfish",
    "hog. fish": "hogfish",
    "horse eye": "horse eye jack",
    "jolthead": "jolthead porgy",
    "lane": "lane snapper",
    "lemon": "lemon shark",
    "longspine": "longspine squirrelfish",
    "magate": "margate",
    "mahogany": "mahogany snapper",
    "mangrove (gray)": "mangrove (gray snapper)",
    "misty": "misty grouper",
    "ole wife": "ole wife (queen triggerfish)",
    "ole wife (queen)": "ole wife (queen triggerfish)",
    "ole wilfe (queen)": "ole wife (queen triggerfish)",
    "princess": "princess parrotfish",
    "redband": "redband parrotfish",
    "red belly (stoplight)": "red belly (stoplight parrotfish)",
    "redfin": "redfin parrotfish",
    "redtail": "redtail parrotfish",
    "silk": "silk snapper",
    "tomate": "tomtate",
    "vermillion": "vermilion snapper",
    "virgin (mutton)": "virgin (mutton) snapper",
    "yellowfin": "yellowfin tuna",
    "yellowtail": "yellowtail snapper",
    "yellow tail": "yellowtail snapper",
    "yellow tal": "yellowtail snapper",
    "yllow tail": "yellowtail snapper"
}


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
        if name.endswith('s'):
            query = query | Q(name__iexact=name[:-1])
        map_match = species_mapping.get(name.strip().lower(), None)
        if map_match is not None:
            query = query | Q(name__iexact=map_match)
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
    ('stcroix', 'St. Croix'),
    ('stthomas', 'St. Thomas/St. John'),
    ('puertorico', 'Puerto Rico'),
    ('uscaribeez', 'U.S. Caribbean Exclusive Economic Zone'),
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
    objects = caching.base.CachingManager()

    @property
    def by_species(self):
        return self.species.__class__.__name__ == 'Species'

    class Meta:
        unique_together = ("content_type", "object_id", "start_date", "end_date", "area", "sector", )
        ordering = ['content_type', 'object_id', 'area', 'start_date', 'end_date']
