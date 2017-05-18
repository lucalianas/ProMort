# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-03-28 06:52
from __future__ import unicode_literals

from django.db import migrations

import logging
logger = logging.getLogger('promort')


def rename_groups(apps, schema_editor):
    groups_map = [
        {
            'old_name': 'REVIEWER_1',
            'new_name': 'ROIS_MANAGERS'
        },
        {
            'old_name': 'REVIEWER_2',
            'new_name': 'CLINICAL_MANAGERS'
        },
        {
            'old_name': 'REVIEWER_3',
            'new_name': 'GOLD_STANDARDS'
        }
    ]
    Group = apps.get_model('auth', 'Group')
    for group_desc in groups_map:
        logger.info('Getting group %s', group_desc['old_name'])
        group_obj = Group.objects.get(name=group_desc['old_name'])
        logger.info('Setting new name %s', group_desc['new_name'])
        group_obj.name = group_desc['new_name']
        group_obj.save()
        logger.info('Group name updated')


class Migration(migrations.Migration):

    dependencies = [
        ('worklist_manager', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(rename_groups),
    ]
