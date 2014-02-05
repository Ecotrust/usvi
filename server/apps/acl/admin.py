from django.contrib import admin
from acl.models import *


class DialectSpeciesAdmin(admin.ModelAdmin):
    list_display = ('name', 'dialect_name', 'species_name',)


class AnnualCatchLimitAdmin(admin.ModelAdmin):
    list_display = ('species', 'area', 'pounds', 'start_date', 'end_date',)

admin.site.register(AnnualCatchLimit, AnnualCatchLimitAdmin)
admin.site.register(Dialect)
admin.site.register(SpeciesFamily)
admin.site.register(Species)
admin.site.register(DialectSpecies, DialectSpeciesAdmin)
