# Generated by Django 3.1.7 on 2021-04-24 13:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rois_manager', '0020_auto_20201123_1615'),
    ]

    operations = [
        migrations.AlterField(
            model_name='focusregion',
            name='tissue_status',
            field=models.CharField(choices=[('NORMAL', 'Normal'), ('STRESSED', 'Stressed'), ('TUMOR', 'Tumor')], max_length=8),
        ),
    ]
