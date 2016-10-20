(function () {
    'use strict';

    angular
        .module('promort.rois_manager.controllers')
        .controller('ROIsManagerController', ROIsManagerController)
        .controller('NewScopeController', NewScopeController)
        .controller('NewSliceController', NewSliceController)
        .controller('NewCoreController', NewCoreController)
        .controller('NewFocusRegionController', NewFocusRegionController);

    ROIsManagerController.$inject = ['$scope', '$routeParams', '$rootScope',
        'SlidesManagerService', 'SlicesManagerService', 'CoresManagerService',
        'FocusRegionsManagerService', 'AnnotationsViewerService'];

    function ROIsManagerController($scope, $routeParams, $rootScope, SlidesManagerService,
                                   SlicesManagerService, CoresManagerService,
                                   FocusRegionsManagerService, AnnotationsViewerService) {
        var vm = this;
        vm.slide_id = undefined;
        vm.case_id = undefined;

        vm.ui_active_modes = {
            'new_slice': false,
            'new_core': false,
            'new_focus_region': false,
            'show_slice': false,
            'show_core': false,
            'show_focus_region': false
        };

        vm.allModesOff = allModesOff;
        vm.activateNewSliceMode = activateNewSliceMode;
        vm.newSliceModeActive = newSliceModeActive;
        vm.activateNewCoreMode = activateNewCoreMode;
        vm.newCoreModeActive = newCoreModeActive;
        vm.activateNewFocusRegionMode = activateNewFocusRegionMode;
        vm.newFocusRegionModeActive = newFocusRegionModeActive;

        activate();

        function activate() {
            vm.slide_id = $routeParams.slide;
            vm.case_id = $routeParams.case;

            $rootScope.slices = [];
            $rootScope.cores = [];
            $rootScope.focus_regions = [];

            // draw existing ROIs as soon as viewer's components are registered
            $scope.$on('viewerctrl.components.registered',
                function() {
                    console.log('Retrieving existing slices');
                    SlidesManagerService.getSlices(vm.slide_id).then(getSlicesSuccessFn, getSlicesErrorFn);

                    function getSlicesSuccessFn(response) {
                        function drawSlice(slice_data) {
                            AnnotationsViewerService.drawShape($.parseJSON(slice_data.roi_json));
                            var slice_info = {
                                'id': slice_data.id,
                                'label': slice_data.label
                            };
                            $rootScope.$broadcast('slice.new', slice_info);
                            // load cores
                            SlicesManagerService.getCores(slice_data.id)
                                .then(getCoresSuccessFn, getCoresErrorFn);
                        }
                        response.data.slices.forEach(drawSlice);
                    }

                    function getSlicesErrorFn(response) {
                        console.error('Unable to load slices for slide ' + vm.slide_id);
                        console.error(response.data);
                    }

                    function getCoresSuccessFn(response) {
                        function drawCore(core_data) {
                            console.log('Drawing core ' + core_data.label);
                            AnnotationsViewerService.drawShape($.parseJSON(core_data.roi_json));
                            var core_info = {
                                'id': core_data.id,
                                'label': core_data.label,
                                'slice': core_data.slice
                            };
                            $rootScope.$broadcast('core.new', core_info);
                            // load focus regions
                            CoresManagerService.getFocusRegions(core_data.id)
                                .then(getFocusRegionsSuccessFn, getFocusRegionsErrorFn)
                        }
                        response.data.cores.forEach(drawCore);
                    }

                    function getCoresErrorFn(response) {
                        console.error('Unable to load cores');
                        console.error(response.data);
                    }

                    function getFocusRegionsSuccessFn(response) {
                        function drawFocusRegion(focus_region_data) {
                            console.log('Drawing focus regions ' + focus_region_data.label);
                            AnnotationsViewerService.drawShape($.parseJSON(focus_region_data.roi_json));
                            var focus_region_info = {
                                'id': focus_region_data.id,
                                'label': focus_region_data.label,
                                'core': focus_region_data.core
                            };
                            $rootScope.$broadcast('focus_region.new', focus_region_info);
                        }
                        response.data.focus_regions.forEach(drawFocusRegion);
                    }

                    function getFocusRegionsErrorFn(response) {
                        console.error('Unable to load focus regions');
                        console.error(response.data);
                    }
                }
            );

            // shut down creation forms when specific events occur
            $scope.$on('tool.destroyed',
                function() {
                    vm.allModesOff();
                }
            );
            $scope.$on('slice.new',
                function(event, slice_info){
                    $rootScope.slices.push(slice_info);
                    vm.allModesOff();
                }
            );

            $scope.$on('core.new',
                function(event, core_info) {
                    $rootScope.cores.push(core_info);
                    vm.allModesOff();
                }
            );

            $scope.$on('focus_region.new',
                function(event, focus_region_info) {
                    $rootScope.focus_regions.push(focus_region_info);
                    vm.allModesOff();
                }
            );
        }

        function allModesOff() {
            for (var mode in vm.ui_active_modes) {
                vm.ui_active_modes[mode] = false;
            }
        }

        function activateNewSliceMode() {
            vm.allModesOff();
            vm.ui_active_modes['new_slice'] = true;
        }

        function newSliceModeActive() {
            return vm.ui_active_modes['new_slice'];
        }

        function activateNewCoreMode() {
            vm.allModesOff();
            vm.ui_active_modes['new_core'] = true;
        }

        function newCoreModeActive() {
            return vm.ui_active_modes['new_core'];
        }

        function activateNewFocusRegionMode() {
            vm.allModesOff();
            vm.ui_active_modes['new_focus_region'] = true;
        }

        function newFocusRegionModeActive() {
            return vm.ui_active_modes['new_focus_region'];
        }
    }

    NewScopeController.$inject = ['$scope'];

    function NewScopeController($scope) {
        var vm = this;
        vm.$scope = {};
    }

    NewSliceController.$inject = ['$scope', '$routeParams', '$rootScope',
        'AnnotationsViewerService', 'SlidesManagerService'];

    function NewSliceController($scope, $routeParams, $rootScope,
                                AnnotationsViewerService, SlidesManagerService) {
        var vm = this;
        vm.slide_id = undefined;
        vm.case_id = undefined;
        vm.shape = undefined;
        vm.totalCores = 0;

        vm.read_only_mode = false;
        vm.active_tool = undefined;
        vm.polygon_tool_paused = false;

        vm.POLYGON_TOOL = 'polygon_drawing_tool';
        vm.FREEHAND_TOOL = 'freehand_drawing_tool';

        vm.newPolygon = newPolygon;
        vm.newFreehand = newFreehand;
        vm.save = save;
        vm.setReadOnlyMode = setReadOnlyMode;
        vm.isReadOnly = isReadOnly;
        vm.isPolygonToolActive = isPolygonToolActive;
        vm.isPolygonToolPaused = isPolygonToolPaused;
        vm.isFreehandToolActive = isFreehandToolActive;
        vm.shapeExists = shapeExists;
        vm.pausePolygonTool = pausePolygonTool;
        vm.unpausePolygonTool = unpausePolygonTool;
        vm.confirmPolygon = confirmPolygon;
        vm.abortTool = abortTool;
        vm.clear = clear;
        vm.focusOnShape = focusOnShape;
        vm.deleteShape = deleteShape;
        vm.formValid = formValid;
        vm.destroy = destroy;

        activate();

        function activate() {
            vm.slide_id = $routeParams.slide;
            vm.case_id = $routeParams.case;
        }

        function newPolygon() {
            console.log('Start polygon drawing tool');
            AnnotationsViewerService.startPolygonsTool();
            vm.active_tool = vm.POLYGON_TOOL
        }

        function newFreehand() {
            console.log('Start freehabd drawing tool');
            AnnotationsViewerService.setFreehandToolLabelPrefix('slice');
            AnnotationsViewerService.startFreehandDrawingTool();
            var canvas_label = AnnotationsViewerService.getCanvasLabel();
            var $canvas = $('#' + canvas_label);
            $canvas.on('freehand_polygon_saved',
                function(event, polygon_label) {
                    console.log('Freehand drawing saved');
                    vm.shape = AnnotationsViewerService.getShapeJSON(polygon_label);
                    // calling the click event of the button will also refresh page and apply
                    // proper angular.js controller rules
                    vm.abortTool();
                    $canvas.unbind('freehand_polygon_saved');
                    $scope.$apply();
                }
            );
            vm.active_tool = vm.FREEHAND_TOOL;
        }

        function setReadOnlyMode() {
            vm.read_only_mode = true;
        }

        function isReadOnly() {
            return vm.read_only_mode;
        }

        function isPolygonToolActive() {
            return vm.active_tool === vm.POLYGON_TOOL;
        }

        function isPolygonToolPaused() {
            return vm.polygon_tool_paused;
        }

        function isFreehandToolActive() {
            return vm.active_tool === vm.FREEHAND_TOOL;
        }

        function shapeExists() {
            return vm.shape != undefined;
        }

        function pausePolygonTool() {
            AnnotationsViewerService.disableActiveTool();
            vm.polygon_tool_paused = true;
        }

        function unpausePolygonTool() {
            AnnotationsViewerService.startPolygonsTool();
            vm.polygon_tool_paused = false;
        }

        function confirmPolygon() {
            var canvas_label = AnnotationsViewerService.getCanvasLabel();
            var $canvas = $('#' + canvas_label);
            $canvas.on('polygon_saved',
                function(event, polygon_label) {
                    console.log('Polygon saved!');
                    vm.shape = AnnotationsViewerService.getShapeJSON(polygon_label);
                    vm.abortTool();
                    $canvas.unbind('polygon_saved');
                }
            );
            AnnotationsViewerService.saveTemporaryPolygon('slice');
        }

        function clear() {
            vm.deleteShape();
            vm.totalCores = 0;
        }

        function abortTool() {
            console.log('Aborting tool');
            if (vm.active_tool === vm.POLYGON_TOOL) {
                AnnotationsViewerService.clearTemporaryPolygon();
            }
            AnnotationsViewerService.disableActiveTool();
            vm.active_tool = undefined;
        }

        function destroy() {
            vm.clear();
            vm.abortTool();
            $rootScope.$broadcast('tool.destroyed');
        }

        function deleteShape() {
            if (typeof this.shape !== 'undefined') {
                AnnotationsViewerService.deleteShape(vm.shape.shape_id);
                vm.shape = undefined;
            }
        }

        function focusOnShape() {
            AnnotationsViewerService.focusOnShape(vm.shape.shape_id);
        }

        function formValid() {
            return (typeof(vm.shape) !== 'undefined');
        }

        function save() {
            console.log(vm.slide_id, vm.shape.shape_id,
                vm.shape, vm.totalCores);
            SlidesManagerService.createSlice(vm.slide_id, vm.shape.shape_id, vm.shape, vm.totalCores)
                .then(createSliceSuccessFn, createSliceErrorFn);

            function createSliceSuccessFn(response) {
                var slice_info = {
                    'id': response.data.id,
                    'label': response.data.label
                };
                $rootScope.$broadcast('slice.new', slice_info);
            }

            function createSliceErrorFn(response) {
                console.error('Unable to save slice!!!');
                console.error(response.data);
            }
        }
    }

    NewCoreController.$inject = ['$scope', '$routeParams', '$rootScope',
        'AnnotationsViewerService', 'SlicesManagerService'];

    function NewCoreController($scope, $routeParams, $rootScope,
                               AnnotationsViewerService, SlicesManagerService) {
        var vm = this;
        vm.slide_id = undefined;
        vm.case_id = undefined;
        vm.parentSlice = undefined;
        vm.shape = undefined;
        vm.coreLength = undefined;
        vm.coreArea = undefined;

        vm.read_only_mode = false;
        vm.active_tool = undefined;
        vm.polygon_tool_paused = false;

        vm.POLYGON_TOOL = 'polygon_drawing_tool';
        vm.FREEHAND_TOOL = 'freehand_drawing_tool';
        vm.RULER_TOOL = 'ruler_tool';

        vm.newPolygon = newPolygon;
        vm.newFreehand = newFreehand;
        vm._updateCoreData = _updateCoreData;
        vm.initializeRuler = initializeRuler;
        vm.startRuler = startRuler;
        vm.save = save;
        vm.setReadOnlyMode = setReadOnlyMode;
        vm.isReadOnly = isReadOnly;
        vm.isPolygonToolActive = isPolygonToolActive;
        vm.isPolygonToolPaused = isPolygonToolPaused;
        vm.isFreehandToolActive = isFreehandToolActive;
        vm.isRulerToolActive = isRulerToolActive;
        vm.shapeExists = shapeExists;
        vm.coreLengthExists = coreLengthExists;
        vm.pausePolygonTool = pausePolygonTool;
        vm.unpausePolygonTool = unpausePolygonTool;
        vm.confirmPolygon = confirmPolygon;
        vm.stopRuler = stopRuler;
        vm.abortTool = abortTool;
        vm.clear = clear;
        vm.focusOnShape = focusOnShape;
        vm.deleteShape = deleteShape;
        vm.deleteRuler = deleteRuler;
        vm.formValid = formValid;
        vm.destroy = destroy;

        activate();

        function activate() {
            vm.slide_id = $routeParams.slide;
            vm.case_id = $routeParams.case;
            $scope.$on('viewerctrl.components.registered',
                function() {
                    vm.initializeRuler();
                }
            );
        }

        function newPolygon() {
            AnnotationsViewerService.startPolygonsTool();
            vm.active_tool = vm.POLYGON_TOOL;
        }

        function newFreehand() {
            AnnotationsViewerService.setFreehandToolLabelPrefix('core');
            AnnotationsViewerService.startFreehandDrawingTool();
            var canvas_label = AnnotationsViewerService.getCanvasLabel();
            var $canvas = $("#" + canvas_label);
            $canvas.on('freehand_polygon_saved',
                function(event, polygon_label) {
                    // check if new core is contained inside an existing slide
                    var slices = $rootScope.slices;
                    for (var s in slices) {
                        if (AnnotationsViewerService.checkContainment(slices[s].label, polygon_label)) {
                            vm.shape = AnnotationsViewerService.getShapeJSON(polygon_label);
                            console.log('FREEHAND SAVED ' + vm.shape);
                            vm._updateCoreData(polygon_label, slices[s]);
                            break;
                        }
                    }
                    if (typeof vm.shape === 'undefined') {
                        console.error('CORE IS NOT INSIDE A SLIDE');
                        AnnotationsViewerService.deleteShape(polygon_label);
                    }
                    vm.abortTool();
                    $canvas.unbind('freehand_polygon_saved');
                    $scope.$apply();
                }
            );
            vm.active_tool = vm.FREEHAND_TOOL;
        }

        function _updateCoreData(polygon_label, parent_slice) {
            vm.parentSlice = parent_slice;
            vm.coreArea = getAreaInSquareMillimiters(AnnotationsViewerService.getShapeArea(polygon_label), 3);
        }

        function initializeRuler() {
            AnnotationsViewerService.createRulerBindings('core_ruler_on', 'core_ruler_off',
                'core_ruler_output');
        }

        function startRuler() {
            var $ruler_out = $('#core_ruler_output');
            $ruler_out.on('ruler_cleared',
                function(event, ruler_saved) {
                    console.log('ruler_cleared trigger, ruler_saved value is ' + ruler_saved);
                    if (ruler_saved) {
                        console.log($ruler_out.data());
                        vm.coreLength = getLengthInMillimiters($ruler_out.data('measure'), 3);
                        console.log(vm.coreLength);
                        $ruler_out.unbind('ruler_clered');
                    }
                    $scope.$apply();
                }
            );
            vm.active_tool = vm.RULER_TOOL;
        }

        function setReadOnlyMode() {
            vm.read_only_mode = true;
        }

        function isReadOnly() {
            return vm.read_only_mode;
        }

        function isPolygonToolActive() {
            return vm.active_tool === vm.POLYGON_TOOL;
        }

        function isFreehandToolActive() {
            return vm.active_tool === vm.FREEHAND_TOOL;
        }

        function isRulerToolActive() {
            return vm.active_tool === vm.RULER_TOOL;
        }

        function isPolygonToolPaused() {
            return vm.polygon_tool_paused;
        }

        function shapeExists() {
            return vm.shape !== undefined;
        }

        function coreLengthExists() {
            return vm.coreLength !== undefined;
        }

        function pausePolygonTool() {
            AnnotationsViewerService.disableActiveTool();
            vm.polygon_tool_paused = true;
        }

        function unpausePolygonTool() {
            AnnotationsViewerService.startPolygonsTool();
            vm.polygon_tool_paused = false;
        }

        function confirmPolygon() {
            var canvas_label = AnnotationsViewerService.getCanvasLabel();
            var $canvas = $("#" + canvas_label);
            $canvas.on('polygon_saved',
                function(event, polygon_label) {
                    var slices = $rootScope.slices;
                    for (var s in slices) {
                        if (AnnotationsViewerService.checkContainment(slices[s].label, polygon_label)) {
                            vm.shape = AnnotationsViewerService.getShapeJSON(polygon_label);
                            vm._updateCoreData(polygon_label, slices[s]);
                            break;
                        }
                    }
                    if (typeof vm.shape === 'undefined') {
                        console.error('CORE IS NOT INSIDE A SLIDE');
                        AnnotationsViewerService.deleteShape(polygon_label);
                    }
                    vm.abortTool();
                    $canvas.unbind('polygon_saved');
                }
            );
            AnnotationsViewerService.saveTemporaryPolygon('core');
        }

        function stopRuler() {
            AnnotationsViewerService.disableActiveTool();
            vm.active_tool = undefined;
        }

        function clear() {
            if (typeof vm.shape !== 'undefined') {
                vm.deleteShape();
            }
            if (typeof  vm.coreLength !== 'undefined') {
                vm.deleteRuler();
            }
        }

        function abortTool() {
            if (vm.active_tool === vm.POLYGON_TOOL) {
                AnnotationsViewerService.clearTemporaryPolygon();
            }
            if (vm.active_tool === vm.RULER_TOOL) {
                vm.deleteRuler();
            }
            AnnotationsViewerService.disableActiveTool();
            vm.active_tool = undefined;
        }

        function destroy() {
            vm.clear();
            vm.abortTool();
            $rootScope.$broadcast('tool.destroyed');
        }

        function deleteShape() {
            AnnotationsViewerService.deleteShape(vm.shape.shape_id);
            vm.shape = undefined;
            vm.coreArea = undefined;
            vm.coreLength = undefined;
            vm.parentSlice = undefined;
        }

        function deleteRuler() {
            var $ruler_out = $('#core_ruler_output');
            $ruler_out.unbind('ruler_cleared');
            AnnotationsViewerService.clearRuler();
            $ruler_out.removeData('ruler_json')
                .removeData('measure');
            vm.coreLength = undefined;
        }

        function focusOnShape() {
            AnnotationsViewerService.focusOnShape(vm.shape.shape_id);
        }

        function formValid() {
            // if shape exists, we also have the parent slice and the shape area, we only need to check
            // for coreLength to decide if the form is valid
            return ((typeof vm.shape !== 'undefined') && (typeof vm.coreLength !== 'undefined'));
        }

        function save() {
            SlicesManagerService.createCore(vm.parentSlice.id, vm.shape.shape_id, vm.shape,
                vm.coreLength, vm.coreArea)
                .then(createCoreSuccessFn, createCoreErrorFn);

            function createCoreSuccessFn(response) {
                var core_info = {
                    'id': response.data.id,
                    'label': response.data.label,
                    'slice': response.data.slice
                };
                $rootScope.$broadcast('core.new', core_info);
            }

            function createCoreErrorFn(response) {
                console.error('Unable to save core!!!');
                console.error(response.data);
            }
        }
    }

    NewFocusRegionController.$inject = ['$scope', '$rootScope', '$routeParams',
        'AnnotationsViewerService', 'CoresManagerService'];

    function NewFocusRegionController($scope, $rootScope, $routeParams, AnnotationsViewerService,
                                      CoresManagerService) {
        var vm = this;
        vm.slide_id = undefined;
        vm.case_id = undefined;
        vm.parentCore = undefined;
        vm.shape = undefined;
        vm.regionLength = undefined;
        vm.regionArea = undefined;
        vm.coreCoverage = undefined;
        vm.isTumor = false;

        vm.read_only_mode = false;
        vm.active_tool = undefined;
        vm.polygon_tool_paused = false;

        vm.POLYGON_TOOL = 'polygon_drawing_tool';
        vm.FREEHAND_TOOL = 'freehand_drawing_tool';
        vm.RULER_TOOL = 'ruler_tool';

        vm.newPolygon = newPolygon;
        vm.newFreehand = newFreehand;
        vm._updateFocusRegionData = _updateFocusRegionData;
        vm.initializeRuler = initializeRuler;
        vm.startRuler = startRuler;
        vm.save = save;
        vm.setReadOnlyMode = setReadOnlyMode;
        vm.isReadOnly = isReadOnly;
        vm.isPolygonToolActive = isPolygonToolActive;
        vm.isPolygonToolPaused = isPolygonToolPaused;
        vm.isFreehandToolActive = isFreehandToolActive;
        vm.isRulerToolActive = isRulerToolActive;
        vm.shapeExists = shapeExists;
        vm.regionLengthExists = regionLengthExists;
        vm.pausePolygonTool = pausePolygonTool;
        vm.unpausePolygonTool = unpausePolygonTool;
        vm.confirmPolygon = confirmPolygon;
        vm.stopRuler = stopRuler;
        vm.abortTool = abortTool;
        vm.clear = clear;
        vm.focusOnShape = focusOnShape;
        vm.deleteShape = deleteShape;
        vm.deleteRuler = deleteRuler;
        vm.formValid = formValid;
        vm.destroy = destroy;

        activate();

        function activate() {
            vm.slide_id = $routeParams.slide;
            vm.case_id = $routeParams.case;
            $scope.$on('viewerctrl.components.registered',
                function() {
                    vm.initializeRuler();
                }
            );
        }

        function newPolygon() {
            AnnotationsViewerService.startPolygonsTool();
            vm.active_tool = vm.POLYGON_TOOL;
        }

        function newFreehand() {
            AnnotationsViewerService.setFreehandToolLabelPrefix('focus_region');
            AnnotationsViewerService.startFreehandDrawingTool();
            var canvas_label = AnnotationsViewerService.getCanvasLabel();
            var $canvas = $("#" + canvas_label);
            $canvas.on('freehand_polygon_saved',
                function(event, polygon_label){
                    var cores = $rootScope.cores;
                    for (var c in cores) {
                        if (AnnotationsViewerService.checkContainment(cores[c].label, polygon_label)) {
                            vm.shape = AnnotationsViewerService.getShapeJSON(polygon_label);
                            vm._updateFocusRegionData(polygon_label, cores[c]);
                            break;
                        }
                    }
                    if (typeof vm.shape === 'undefined') {
                        console.error('FOCUS REGION IS NOT INSIDE A CORE');
                        AnnotationsViewerService.deleteShape(polygon_label);
                    }
                    vm.abortTool();
                    $canvas.unbind('freehand_polygon_saved');
                    $scope.$apply();
                }
            );
            vm.active_tool = vm.FREEHAND_TOOL;
        }

        function _updateFocusRegionData(polygon_label, parent_core) {
            vm.parentCore = parent_core;
            vm.regionArea = getAreaInSquareMillimiters(AnnotationsViewerService.getShapeArea(polygon_label), 3);
            vm.coreCoverage = AnnotationsViewerService.getAreaCoverage(vm.parentCore.label, polygon_label);
        }

        function initializeRuler() {
            AnnotationsViewerService.createRulerBindings('focus_region_ruler_on', 'focus_region_ruler_off',
                'focus_region_ruler_output');
        }

        function startRuler() {
            var $ruler_out = $('#focus_region_ruler_output');
            $ruler_out.on('ruler_cleared',
                function(event, ruler_saved) {
                    if (ruler_saved) {
                        vm.regionLength = getLengthInMillimiters($ruler_out.data('measure'), 3);
                        $ruler_out.unbind('ruler_cleared');
                    }
                    $scope.$apply();
                }
            );
            vm.active_tool = vm.RULER_TOOL;
        }

        function setReadOnlyMode() {
            vm.read_only_mode = true;
        }

        function isReadOnly() {
            return vm.read_only_mode;
        }

        function isPolygonToolActive() {
            return vm.active_tool === vm.POLYGON_TOOL;
        }

        function isFreehandToolActive() {
            return vm.active_tool === vm.FREEHAND_TOOL;
        }

        function isRulerToolActive() {
            return vm.active_tool === vm.RULER_TOOL;
        }

        function isPolygonToolPaused() {
            return vm.polygon_tool_paused;
        }

        function shapeExists() {
            return vm.shape !== undefined;
        }

        function regionLengthExists() {
            return vm.regionLength !== undefined;
        }

        function pausePolygonTool() {
            AnnotationsViewerService.disableActiveTool();
            vm.polygon_tool_paused = true;
        }

        function unpausePolygonTool() {
            AnnotationsViewerService.startPolygonsTool();
            vm.polygon_tool_paused = false;
        }

        function confirmPolygon() {
            var canvas_label = AnnotationsViewerService.getCanvasLabel();
            var $canvas = $("#" + canvas_label);
            $canvas.on('polygon_saved',
                function(event, polygon_label) {
                    var cores = $rootScope.cores;
                    for (var c in cores) {
                        if (AnnotationsViewerService.checkContainment(cores[c].label, polygon_label)) {
                            vm.shape = AnnotationsViewerService.getShapeJSON(polygon_label);
                            vm._updateFocusRegionData(polygon_label, cores[c]);
                            break;
                        }
                    }
                    if (typeof vm.shape === 'undefined') {
                        console.error('FOCUS REGION IS NOT INSIDE A CORE');
                        AnnotationsViewerService.deleteShape(polygon_label);
                    }
                    vm.abortTool();
                    $canvas.unbind('polygon_saved');
                }
            );
            AnnotationsViewerService.saveTemporaryPolygon('focus_region');
        }

        function stopRuler() {
            AnnotationsViewerService.disableActiveTool();
            vm.active_tool = undefined;
        }

        function clear() {
            if (typeof vm.shape !== 'undefined') {
                vm.deleteShape();
            }
            if (typeof  vm.coreLength !== 'undefined') {
                vm.deleteRuler();
            }
        }

        function abortTool() {
            if (vm.active_tool === vm.POLYGON_TOOL) {
                AnnotationsViewerService.clearTemporaryPolygon();
            }
            if (vm.active_tool === vm.RULER_TOOL) {
                vm.deleteRuler();
            }
            AnnotationsViewerService.disableActiveTool();
            vm.active_tool = undefined;
        }

        function destroy() {
            vm.clear();
            vm.abortTool();
            $rootScope.$broadcast('tool.destroyed');
        }

        function deleteShape() {
            console.log('deleting shape ' + vm.shape.shape_id);
            AnnotationsViewerService.deleteShape(vm.shape.shape_id);
            vm.shape = undefined;
            vm.regionArea = undefined;
            vm.regionLength = undefined;
            vm.parentCore = undefined;
            vm.coreCoverage = undefined;
        }

        function deleteRuler() {
            var $ruler_out = $('#focus_region_ruler_output');
            $ruler_out.unbind('ruler_cleared');
            AnnotationsViewerService.clearRuler();
            $ruler_out.removeData('ruler_json')
                .removeData('measure');
            vm.regionLength = undefined;
        }

        function focusOnShape() {
            AnnotationsViewerService.focusOnShape(vm.shape.shape_id);
        }

        function save() {
            CoresManagerService.createFocusRegion(vm.parentCore.id, vm.shape.shape_id, vm.shape,
                vm.regionLength, vm.regionArea, vm.isTumor)
                .then(createFocusRegionSuccessFn, createFocusRegionErrorFn);

            function createFocusRegionSuccessFn(response) {
                var focus_region_info = {
                    'id': response.data.id,
                    'label': response.data.label,
                    'core': response.data.core
                };
                $rootScope.$broadcast('focus_region.new', focus_region_info);
            }

            function createFocusRegionErrorFn(response) {
                console.error('Unable to save focus region!!!');
                console.error(response.data);
            }
        }

        function formValid() {
            return ((typeof vm.shape !== 'undefined') && (typeof vm.regionLength !== 'undefined'));
        }
    }
})();