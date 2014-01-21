from django.contrib import admin
from acl.models import *


class DialectSpeciesAdmin(admin.ModelAdmin):
    list_display = ('name', 'dialect_name', 'species_name',)

admin.site.register(AnnualCatchLimit)
admin.site.register(Dialect)
admin.site.register(SpeciesFamily)
admin.site.register(Species)
admin.site.register(DialectSpecies, DialectSpeciesAdmin)
