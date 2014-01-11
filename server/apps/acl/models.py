from django.db import models
import caching.base


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
