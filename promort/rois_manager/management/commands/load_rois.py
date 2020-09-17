#  Copyright (c) 2019, CRS4
#
#  Permission is hereby granted, free of charge, to any person obtaining a copy of
#  this software and associated documentation files (the "Software"), to deal in
#  the Software without restriction, including without limitation the rights to
#  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
#  the Software, and to permit persons to whom the Software is furnished to do so,
#  subject to the following conditions:
#
#  The above copyright notice and this permission notice shall be included in all
#  copies or substantial portions of the Software.
#
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
#  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
#  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
#  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
#  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

from django.core.management.base import BaseCommand, CommandError
from rois_manager.models import Slice, Core
from reviews_manager.models import ROIsAnnotationStep
from django.contrib.auth.models import User

try:
    import simplejson as json
except ImportError:
    import json

import logging, math

logger = logging.getLogger('promort_commands')


class Command(BaseCommand):
    help = """
    """

    def add_arguments(self, parser):
        parser.add_argument('--rois_file', dest='rois_file', type=str, required=True,
                            help='file containing ROIs in JSON format')
        parser.add_argument('--slide_id', dest='slide_id', type=str, required=True,
                            help='slide ID')
        parser.add_argument('--reviewer', dest='reviewer', type=str, required=False,
                            default=None, help='apply only to ROIs annotation steps assigned to this reviewer')
        parser.add_argument('--username', dest='username', type=str, required=True,
                            help='user that will create the new ROIs')
        parser.add_argument('--clear_rois', action='store_true',
                            help='delete existing ROIs for this slide\'s existing annotation steps')

    def _load_user(self, username):
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            logger.error('There is no user with username %s', username)
            raise CommandError('There is no user with username %s' % username)

    def _load_annotation_steps(self, slide_id, reviewer=None):
        filter = {
            'slide_id': slide_id,
            'start_date__isnull': True
        }
        if reviewer:
            logger.info('Filter steps assigned to reviewer %s', reviewer)
            filter['rois_annotation__reviewer__username'] = reviewer

        annotations_steps = ROIsAnnotationStep.objects.filter(**filter)
        logger.info('Loaded %d ROIs annotation steps' % len(annotations_steps))
        return annotations_steps

    def _clean_annotation_step(self, annotation_step_obj):
        for core in annotation_step_obj.cores:
            core.delete()
        for slice in annotation_step_obj.slices.all():
            slice.delete()

    def _create_roi_json(self, roi_coordinates, shape_id, stroke_color):
        return {
            'fill_color': '#ffffff',
            'fill_alpha': 0.01,
            'hidden': False,
            'segments': [{'point': {'x': rc[0], 'y': rc[1]}} for rc in roi_coordinates],
            'shape_id': shape_id,
            'stroke_alpha': 1,
            'stroke_color': stroke_color,
            'stroke_width': 40,
            'type': 'polygon'
        }

    def _create_slice(self, slice_coordinates, slice_id, cores_count, annotation_step, user):
        roi_json = self._create_roi_json(slice_coordinates, 'slice_s%02d' % slice_id, '#000000')
        slice = Slice(label=roi_json['shape_id'], annotation_step=annotation_step,
                      slide=annotation_step.slide, author=user, roi_json=json.dumps(roi_json),
                      total_cores=cores_count)
        slice.save()
        return slice

    def _create_core(self, core_coordinates, core_length, core_area, slice, slice_id, core_id, user):
        roi_json = self._create_roi_json(core_coordinates, 'core_s%02d_c%02d' % (slice_id, core_id),
                                         '#0000ff')
        core = Core(label=roi_json['shape_id'], slice=slice, author=user, roi_json=json.dumps(roi_json),
                    length=core_length, area=core_area)
        core.save()
        return core

    def handle(self, *args, **opts):
        logger.info('== Starting import job ==')
        annotation_steps = self._load_annotation_steps(opts['slide_id'], opts['reviewer'])
        if len(annotation_steps) > 0:
            user = self._load_user(opts['username'])
            with open(opts['rois_file']) as jfile:
                rois = json.loads(jfile.read())
                for step in annotation_steps:
                    logger.info('-- Processing ROIs annotation step %s', step.label)
                    if opts['clear_rois']:
                        logger.info('Cleaning existing ROIs')
                        self._clean_annotation_step(step)
                    for slice_index, slice in enumerate(rois):
                        logger.info('- Loading slice %d of %d', slice_index+1, len(rois))
                        slide_mpp = step.slide.image_microns_per_pixel
                        slice_obj = self._create_slice(slice['coordinates'], slice_index+1, len(slice['cores']),
                                                       step, user)
                        logger.info('Slice saved with ID %d', slice_obj.id)
                        for core_index, core in enumerate(slice['cores']):
                            logger.info('Loading core %d of %d', core_index+1, len(slice['cores']))
                            core_obj = self._create_core(core['coordinates'], core['length'] * slide_mpp,
                                                         core['area'] * math.pow(slide_mpp, 2),
                                                         slice_obj, slice_index+1, core_index+1, user)
                            logger.info('Core saved with ID %d', core_obj.id)
        else:
            logger.info('== There are no suitable ROIs annotation steps')
        logger.info('== Job completed ==')
