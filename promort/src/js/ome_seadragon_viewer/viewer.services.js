(function () {
    'use strict';

    angular
        .module('promort.viewer.services')
        .factory('ViewerService', ViewerService)
        .factory('AnnotationsViewerService', AnnotationsViewerService);

    ViewerService.$inject = ['$http'];

    function ViewerService($http) {
        var ViewerService = {
            getOMEBaseURLs: getOMEBaseURLs,
            getSlideInfo: getSlideInfo
        };

        return ViewerService;

        function getOMEBaseURLs() {
            return $http.get('api/utils/omeseadragon_base_urls/');
        }

        function getSlideInfo(slide_id) {
            return $http.get('api/slides/' + slide_id + '/');
        }
    }

    function AnnotationsViewerService() {
        var AnnotationsViewerService = {
            registerComponents: registerComponents,
            checkComponents: checkComponents,
            drawShape: drawShape,
            extendPolygonConfig: extendPolygonConfig,
            startPolygonsTool: startPolygonsTool,
            disableActiveTool: disableActiveTool,
            saveTemporaryPolygon: saveTemporaryPolygon,
            clearTemporaryPolygon: clearTemporaryPolygon,
            startFreehandDrawingTool: startFreehandDrawingTool,
            setFreehandToolLabelPrefix: setFreehandToolLabelPrefix,
            deleteShape: deleteShape,
            clear: clear,
            deleteShapes: deleteShapes,
            getCanvasLabel: getCanvasLabel,
            getShapeJSON: getShapeJSON,
            getShapeArea: getShapeArea,
            focusOnShape: focusOnShape,
            checkContainment: checkContainment,
            createRulerBindings: createRulerBindings,
            clearRuler: clearRuler
        };

        return AnnotationsViewerService;

        function registerComponents(viewer_manager, rois_manager, tools_manager) {
            this.viewerManager = viewer_manager;
            this.roisManager = rois_manager;
            this.toolsManager = tools_manager;
        }

        function checkComponents() {
            console.log('Viewer Manager: ' + this.viewerManager);
            console.log('ROIs Manager: ' + this.roisManager);
            console.log('Tools Manager: ' + this.toolsManager);
        }

        function drawShape(shape_json) {
            this.roisManager.drawShapeFromJSON(shape_json);
        }

        function extendPolygonConfig(polygon_config) {
            this.roisManager.extendPolygonConfig(polygon_config);
        }

        function startPolygonsTool() {
            this.toolsManager.activateTool(AnnotationsEventsController.POLYGON_DRAWING_TOOL);
        }

        function disableActiveTool() {
            this.roisManager.disableMouseEvents();
        }

        function saveTemporaryPolygon(label_prefix) {
            console.log('Saving temporary polygon');
            this.roisManager.saveTemporaryPolygon(label_prefix);
        }

        function clearTemporaryPolygon() {
            this.roisManager.clearTemporaryPolygon();
        }

        function startFreehandDrawingTool() {
            this.toolsManager.activateTool(AnnotationsEventsController.FREEHAND_DRAWING_TOOL);
        }

        function setFreehandToolLabelPrefix(label_prefix) {
            this.roisManager.setFreehandPathLabelPrefix(label_prefix);
        }

        function deleteShape(shape_id) {
            this.roisManager.deleteShape(shape_id);
        }

        function clear() {
            this.roisManager.clear();
        }

        function deleteShapes(shapes_id) {
            this.roisManager.deleteShapes(shapes_id);
        }

        function getCanvasLabel() {
            return this.roisManager.canvas_id;
        }

        function getShapeJSON(shape_id) {
            return this.roisManager.getShapeJSON(shape_id);
        }

        function getShapeArea(shape_id) {
            return this.roisManager.getShapeDimensions(shape_id).area;
        }

        function focusOnShape(shape_id) {
            this.viewerManager.jumpToShape(shape_id, true);
        }

        function checkContainment(container_label, contained_label) {
            console.log('Getting shape ' + container_label);
            var container = this.roisManager.getShape(container_label);
            console.log(container);
            var contained = this.roisManager.getShape(contained_label);
            console.log('Shape is contained in ' + container_label +'? : ' + container.containsShape(contained));
            return container.containsShape(contained);
        }

        function createRulerBindings(on_switch, off_switch, output) {
            this.roisManager.bindToRuler(on_switch, off_switch, output);
        }

        function clearRuler() {
            this.roisManager.clearRuler(true);
        }
    }
})();