# -*- coding: utf-8 -*-
# Generated by Django 1.11.29 on 2020-11-23 16:15
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rois_manager', '0019_auto_20201123_0925'),
    ]

    operations = [
        migrations.RenameField(
            model_name='core',
            old_name='craetion_start_date',
            new_name='creation_start_date',
        ),
    ]