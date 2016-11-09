/**
 * (c) 2010-2016 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
'use strict';
import H from './Globals.js';
import './Utilities.js';
import './Color.js';
import './Axis.js';
import './Chart.js';
import './Series.js';
import './Options.js';
import './Scrollbar.js';
/* ****************************************************************************
 * Start Navigator code														*
 *****************************************************************************/
var addEvent = H.addEvent,
	Axis = H.Axis,
	Chart = H.Chart,
	color = H.color,
	defaultDataGroupingUnits = H.defaultDataGroupingUnits,
	defaultOptions = H.defaultOptions,
	defined = H.defined,
	destroyObjectProperties = H.destroyObjectProperties,
	doc = H.doc,
	each = H.each,
	erase = H.erase,
	error = H.error,
	extend = H.extend,
	grep = H.grep,
	hasTouch = H.hasTouch,
	isNumber = H.isNumber,
	isObject = H.isObject,
	merge = H.merge,
	pick = H.pick,
	removeEvent = H.removeEvent,
	Scrollbar = H.Scrollbar,
	Series = H.Series,
	seriesTypes = H.seriesTypes,
	wrap = H.wrap,

	units = [].concat(defaultDataGroupingUnits), // copy
	defaultSeriesType,

	// Finding the min or max of a set of variables where we don't know if they are defined,
	// is a pattern that is repeated several places in Highcharts. Consider making this
	// a global utility method.
	numExt = function (extreme) {
		var numbers = grep(arguments, isNumber);
		if (numbers.length) {
			return Math[extreme].apply(0, numbers);
		}
	};

// add more resolution to units
units[4] = ['day', [1, 2, 3, 4]]; // allow more days
units[5] = ['week', [1, 2, 3]]; // allow more weeks

defaultSeriesType = seriesTypes.areaspline === undefined ? 'line' : 'areaspline';

extend(defaultOptions, {
	navigator: {
		//enabled: true,
		height: 40,
		margin: 25,
		maskInside: true,
		/*= if (build.classic) { =*/
		handles: {
			backgroundColor: '${palette.neutralColor5}',
			borderColor: '${palette.neutralColor40}'
		},
		maskFill: color('${palette.highlightColor60}').setOpacity(0.3).get(),
		outlineColor: '${palette.neutralColor20}',
		outlineWidth: 1,
		/*= } =*/
		series: {
			type: defaultSeriesType,
			/*= if (build.classic) { =*/
			color: '${palette.highlightColor80}',
			fillOpacity: 0.05,
			lineWidth: 1,
			/*= } =*/
			compare: null,
			dataGrouping: {
				approximation: 'average',
				enabled: true,
				groupPixelWidth: 2,
				smoothed: true,
				units: units
			},
			dataLabels: {
				enabled: false,
				zIndex: 2 // #1839
			},
			id: 'highcharts-navigator-series',
			className: 'highcharts-navigator-series',
			lineColor: null, // Allow color setting while disallowing default candlestick setting (#4602)
			marker: {
				enabled: false
			},
			pointRange: 0,
			shadow: false,
			threshold: null
		},
		//top: undefined,
		xAxis: {
			className: 'highcharts-navigator-xaxis',
			tickLength: 0,
			/*= if (build.classic) { =*/
			lineWidth: 0,
			gridLineColor: '${palette.neutralColor10}',
			gridLineWidth: 1,
			/*= } =*/
			tickPixelInterval: 200,
			labels: {
				align: 'left',
				/*= if (build.classic) { =*/
				style: {
					color: '${palette.neutralColor40}'
				},
				/*= } =*/
				x: 3,
				y: -4
			},
			crosshair: false
		},
		yAxis: {
			className: 'highcharts-navigator-yaxis',
			/*= if (build.classic) { =*/
			gridLineWidth: 0,
			/*= } =*/
			startOnTick: false,
			endOnTick: false,
			minPadding: 0.1,
			maxPadding: 0.1,
			labels: {
				enabled: false
			},
			crosshair: false,
			title: {
				text: null
			},
			tickLength: 0,
			tickWidth: 0
		}
	}
});

/**
 * The Navigator class
 * @param {Object} chart
 */
function Navigator(chart) {
	this.init(chart);
}

Navigator.prototype = {
	/**
	 * Draw one of the handles on the side of the zoomed range in the navigator
	 * @param {Number} x The x center for the handle
	 * @param {Number} index 0 for left and 1 for right
	 * @param {Boolean} inverted flag for chart.inverted
	 * @param {String} verb use 'animate' or 'attr'
	 */
	drawHandle: function (x, index, inverted, verb) {
		var scroller = this;

		// Place it
		scroller.handles[index][verb](inverted ? {
			translateX: Math.round(scroller.navigatorLeft + scroller.navigatorWidth / 2 - 8),
			translateY: Math.round(scroller.top + parseInt(x, 10) + 0.5)
		} : {
			translateX: Math.round(scroller.navigatorLeft + parseInt(x, 10)),
			translateY: Math.round(scroller.top + scroller.height / 2 - 8)
		});
	},

	/**
	 * Render outline around the zoomed range
	 * @param {Number} zoomedMin in pixels position where zoomed range starts
	 * @param {Number} zoomedMax in pixels position where zoomed range ends
	 * @param {Boolean} inverted flag in chart is inverted
	 * @param {String} verb use 'animate' or 'attr'
	 */
	drawOutline: function (zoomedMin, zoomedMax, inverted, verb) {
		var scroller = this,
			maskInside = scroller.navigatorOptions.maskInside,
			outlineWidth = scroller.outline.strokeWidth(),
			halfOutline = outlineWidth / 2,
			outlineHeight = scroller.outlineHeight,
			scrollbarHeight = scroller.scrollbarHeight,
			navigatorHeight = scroller.navigatorHeight,
			navigatorWidth = scroller.navigatorWidth,
			navigatorLeft = scroller.navigatorLeft,
			navigatorTop = scroller.top,
			verticalMin,
			path;

		if (inverted) {
			navigatorLeft -= scrollbarHeight + halfOutline;
			verticalMin = navigatorTop + zoomedMax + halfOutline;
			zoomedMax = navigatorTop + zoomedMin + halfOutline;

			path = [
				'M',
				navigatorLeft + outlineHeight,
				navigatorTop - scrollbarHeight - halfOutline, // top edge
				'L',
				navigatorLeft + outlineHeight,
				verticalMin, // top right of zoomed range
				navigatorLeft,
				verticalMin, // top left of z.r.
				'L',
				navigatorLeft,
				zoomedMax, // bottom left of z.r.
				'L',
				navigatorLeft + outlineHeight,
				zoomedMax, // bottom right of z.r.
				navigatorLeft + outlineHeight,
				navigatorTop + navigatorHeight + scrollbarHeight // bottom edge
			].concat(maskInside ? [
				'M',
				navigatorLeft + outlineHeight, verticalMin - halfOutline, // upper left of zoomed range
				'L',
				navigatorLeft + outlineHeight, zoomedMax + halfOutline // upper right of z.r.
			] : []);
		} else {
			navigatorLeft = scroller.navigatorLeft - scrollbarHeight;
			zoomedMin += navigatorLeft + scrollbarHeight - halfOutline; // #5800 - TO DO, remove halfOutline
			zoomedMax += navigatorLeft + scrollbarHeight - halfOutline; // #5800 - TO DO, remove halfOutline
			navigatorTop += halfOutline;

			path = [
				'M',
				navigatorLeft, navigatorTop, // left
				'L',
				zoomedMin, navigatorTop, // upper left of zoomed range
				zoomedMin, navigatorTop + outlineHeight, // lower left of z.r.
				'L',
				zoomedMax, navigatorTop + outlineHeight, // lower right of z.r.
				'L',
				zoomedMax, navigatorTop, // upper right of z.r.
				navigatorLeft + navigatorWidth + scrollbarHeight * 2, navigatorTop // right
			].concat(maskInside ? [
				'M',
				zoomedMin - halfOutline, navigatorTop, // upper left of zoomed range
				'L',
				zoomedMax + halfOutline, navigatorTop // upper right of z.r.
			] : []);
		}
		scroller.outline[verb]({
			d: path
		});
	},

	/**
	 * Render outline around the zoomed range
	 * @param {Number} zoomedMin in pixels position where zoomed range starts
	 * @param {Number} zoomedMax in pixels position where zoomed range ends
	 * @param {Boolean} inverted flag in chart is inverted
	 * @param {String} verb use 'animate' or 'attr'
	 */
	drawMasks: function (zoomedMin, zoomedMax, inverted, verb) {
		var scroller = this,
			left = scroller.navigatorLeft,
			top = scroller.navigatorTop,
			scrollerHeight = scroller.height,
			height,
			width,
			x,
			y;

		// Determine rectangle position & size according to (non)inverted position:
		if (inverted) {
			x = [left, left, left];
			y = [top, top + zoomedMin, top + zoomedMax];
			width = [scrollerHeight, scrollerHeight, scrollerHeight];
			height = [zoomedMin, zoomedMax - zoomedMin, scroller.navigatorHeight - zoomedMax];
		} else {
			x = [left, left + zoomedMin, left + zoomedMax];
			y = [top, top, top];
			width = [zoomedMin, zoomedMax - zoomedMin, scroller.navigatorWidth - zoomedMax];
			height = [scrollerHeight, scrollerHeight, scrollerHeight];
		}
		each(scroller.shades, function (shade, i) {
			shade[verb]({
				x: x[i],
				y: y[i],
				width: width[i],
				height: height[i]
			});
		});
	},

	/**
	 * Generate DOM elements:
	 * - main navigator group
	 * - all shades
	 * - outline
	 * - handles
	 */
	renderElements: function () {
		var scroller = this,
			navigatorOptions = scroller.navigatorOptions,
			maskInside = navigatorOptions.maskInside,
			chart = scroller.chart,
			inverted = chart.inverted,
			renderer = chart.renderer,
			navigatorGroup;

		// Create the main navigator group
		scroller.navigatorGroup = navigatorGroup = renderer.g('navigator')
			.attr({
				zIndex: 8
			})
			.add();

		// Create masks, each mask will get events and fill:
		each([!maskInside, maskInside, !maskInside], function (hasMask, index) {
			scroller.shades[index] = renderer.rect()
				.addClass('highcharts-navigator-mask' + (hasMask ? '-inside' : ''))
				/*= if (build.classic) { =*/
				.attr({
					fill: hasMask ? navigatorOptions.maskFill : 'transparent'
				})
				.css(index === 1 && { cursor: inverted ? 'ns-resize' : 'ew-resize' })
				/*= } =*/
				.add(navigatorGroup);
		});

		// Create the outline:
		scroller.outline = renderer.path()
			.addClass('highcharts-navigator-outline')
			/*= if (build.classic) { =*/
			.attr({
				'stroke-width': navigatorOptions.outlineWidth,
				stroke: navigatorOptions.outlineColor
			})
			/*= } =*/
			.add(navigatorGroup);

		// Create the handlers:
		each([0, 1], function (index) {
			scroller.handles[index] = renderer
				.path(H.Scrollbar.prototype.swapXY.call(null, [
					'M',
					-4.5, 0.5,
					'L',
					3.5, 0.5,
					'L',
					3.5, 15.5,
					'L',
					-4.5, 15.5,
					'L',
					-4.5, 0.5,
					'M',
					-1.5, 4,
					'L',
					-1.5, 12,
					'M',
					0.5, 4,
					'L',
					0.5, 12
				], inverted))
				// zIndex = 6 for right handle, 7 for left.
				// Can't be 10, becuase of tooltip in inverted chart #2908
				.attr({ zIndex: 7 - index })
				.addClass(
					'highcharts-navigator-handle highcharts-navigator-handle-' +
					['left', 'right'][index]
				).add(navigatorGroup);

			/*= if (build.classic) { =*/
			var handlesOptions = navigatorOptions.handles;
			scroller.handles[index]
				.attr({
					fill: handlesOptions.backgroundColor,
					stroke: handlesOptions.borderColor,
					'stroke-width': 1
				})
				.css({ cursor: inverted ? 'ns-resize' : 'ew-resize' });
			/*= } =*/
		});
	},

	/**
	 * Update navigator
	 * @param {Object} options Options to merge in when updating navigator
	 */
	update: function (options) {
		this.destroy();
		var chartOptions = this.chart.options;
		merge(true, chartOptions.navigator, this.options, options);
		this.init(this.chart);
	},

	/**
	 * Render the navigator
	 * @param {Number} min X axis value minimum
	 * @param {Number} max X axis value maximum
	 * @param {Number} pxMin Pixel value minimum
	 * @param {Number} pxMax Pixel value maximum
	 */
	render: function (min, max, pxMin, pxMax) {
		var scroller = this,
			chart = scroller.chart,
			navigatorHeight,
			navigatorLeft,
			navigatorWidth,
			scrollerTop,
			scrollerWidth,
			scrollerHeight,
			scrollbarLeft,
			scrollbarTop,
			scrollbarHeight = scroller.scrollbarHeight,
			xAxis = scroller.xAxis,
			height = scroller.height,
			navigatorEnabled = scroller.navigatorEnabled,
			zoomedMin,
			zoomedMax,
			rendered = scroller.rendered,
			inverted = chart.inverted,
			verb;

		// Don't render the navigator until we have data (#486, #4202, #5172). Don't redraw while moving the handles (#4703).
		if (!isNumber(min) || !isNumber(max) ||	(scroller.hasDragged && !defined(pxMin))) {
			return;
		}

		if (inverted) {
			scroller.navigatorTop = pick(
				xAxis.top,
				chart.plotTop + scrollbarHeight // in case of scrollbar only, without navigator
			);
			scroller.navigatorHeight = zoomedMax = navigatorHeight = pick(
				xAxis.len,
				chart.plotHeight - 2 * scrollbarHeight
			);
			scroller.navigatorWidth = navigatorWidth = height;
			scroller.scrollerTop = scrollerTop = scroller.navigatorTop - scrollbarHeight;
			scroller.scrollerHeight = scrollerHeight = navigatorHeight + 2 * scrollbarHeight;
		} else {
			scroller.navigatorTop = scroller.top;
			scroller.navigatorWidth = zoomedMax = navigatorWidth = pick(xAxis.len, chart.plotWidth - 2 * scrollbarHeight);
			scroller.scrollerWidth = scrollerWidth = navigatorWidth + 2 * scrollbarHeight;
		}
		scroller.navigatorLeft = navigatorLeft = pick(
			xAxis.left,
			chart.plotLeft + scrollbarHeight // in case of scrollbar only, without navigator
		);
		scroller.scrollerLeft = scrollbarLeft = navigatorLeft - scrollbarHeight;

		// Get the pixel position of the handles
		pxMin = pick(pxMin, xAxis.toPixels(min, true));
		pxMax = pick(pxMax, xAxis.toPixels(max, true));
		if (!isNumber(pxMin) || Math.abs(pxMin) === Infinity) { // Verify (#1851, #2238)
			pxMin = 0;
			pxMax = scrollerWidth;
		}

		// Are we below the minRange? (#2618)
		if (xAxis.toValue(pxMax, true) - xAxis.toValue(pxMin, true) < chart.xAxis[0].minRange) {
			return;
		}

		// Handles are allowed to cross, but never exceed the plot area
		scroller.zoomedMax = Math.min(Math.max(pxMin, pxMax, 0), zoomedMax);
		scroller.zoomedMin = Math.min(Math.max(scroller.fixedWidth ? scroller.zoomedMax - scroller.fixedWidth : Math.min(pxMin, pxMax), 0), zoomedMax);
		scroller.range = scroller.zoomedMax - scroller.zoomedMin;

		zoomedMax = Math.round(scroller.zoomedMax);
		zoomedMin = Math.round(scroller.zoomedMin);

		if (navigatorEnabled) {
			// Place elements
			verb = rendered && !scroller.hasDragged ? 'animate' : 'attr';

			scroller.drawMasks(zoomedMin, zoomedMax, inverted, verb);
			scroller.drawOutline(zoomedMin, zoomedMax, inverted, verb);
			scroller.drawHandle(zoomedMin, 0, inverted, verb);
			scroller.drawHandle(zoomedMax, 1, inverted, verb);
		}

		if (scroller.scrollbar) {
			scroller.scrollbar.hasDragged = scroller.hasDragged;
				
			// TO DO: refactor to one "size" variable?
			if (inverted) {
				scrollbarTop = scrollerTop;
				scrollbarLeft = scroller.scrollerLeft + (navigatorEnabled ? 0 : scroller.height);
				scrollbarHeight = scrollerHeight;
				scrollerWidth = scrollbarHeight;
				zoomedMin /= navigatorHeight;
				zoomedMax /= navigatorHeight;
			} else {
				scrollbarTop = scroller.top + (navigatorEnabled ? scroller.height : -scrollbarHeight);
				zoomedMin /= navigatorWidth;
				zoomedMax /= navigatorWidth;
			}
			scroller.scrollbar.position(
				scrollbarLeft,
				scrollbarTop,
				scrollerWidth,
				scrollbarHeight
			);
			// Keep scale 0-1
			scroller.scrollbar.setRange(zoomedMin, zoomedMax);
		}
		scroller.rendered = true;
	},

	/**
	 * Set up the mouse and touch events for the navigator
	 */
	addMouseEvents: function () {
		var navigator = this,
			chart = navigator.chart,
			container = chart.container,
			eventsToUnbind = [],
			mouseMoveHandler,
			mouseUpHandler,
			_events;

		/**
		 * Create mouse events' handlers.
		 * Make them as separate functions to enable wrapping them:
		 */
		navigator.mouseMoveHandler = mouseMoveHandler = function (e) {
			navigator.onMouseMove(e);
		};
		navigator.mouseUpHandler = mouseUpHandler = function (e) {
			navigator.onMouseUp(e);
		};

		// Store shades and handles mousedown events
		_events = navigator.getPartsEvents('mousedown');
		// Store mouse move and mouseup events. These are bind to doc/container,
		// because Navigator.grabbedSomething flags are stored in mousedown events:
		_events.push(
			[container, 'mousemove', mouseMoveHandler],
			[doc, 'mouseup', mouseUpHandler]
		);

		// Touch events
		if (hasTouch) {
			_events.push(
				[container, 'touchmove', mouseMoveHandler],
				[doc, 'touchend', mouseUpHandler]
			);
			_events.concat(navigator.getPartsEvents('touchstart'));
		}

		// Add them all
		each(_events, function (args) {
			eventsToUnbind.push(addEvent.apply(null, args));
		});
		this.eventsToUnbind = eventsToUnbind;

		// Data events
		if (this.series && this.series[0]) {
			eventsToUnbind.push(
				addEvent(this.series[0].xAxis, 'foundExtremes', function () {
					chart.scroller.modifyNavigatorAxisExtremes();
				})
			);
		}

		addEvent(chart, 'redraw', function () {
			// Move the scrollbar after redraw, like after data updata even if axes don't redraw
			var scroller = this.scroller,
				xAxis = scroller && (scroller.baseSeries && scroller.baseSeries[0] && scroller.baseSeries[0].xAxis || scroller.scrollbar && this.xAxis[0]); // #5709

			if (xAxis) {
				scroller.render(xAxis.min, xAxis.max);
			}
		});
	},

	/**
	 * Generate events for handles and masks 
	 * @param {String} eventName Event name handler, 'mousedown' or 'touchstart'
	 * @returns {Array} An array of arrays: [DOMElement, eventName, callback].
	 */
	getPartsEvents: function (eventName) {
		var navigator = this,
			events = [];
		each(['shades', 'handles'], function (name) {
			each(navigator[name], function (navigatorItem, index) {
				events.push([
					navigatorItem.element,
					eventName,
					function (e) {
						navigator[name + 'Mousedown'](e, index);
					}
				]);
			});
		});
		return events;
	},

	/**
	 * Mousedown on a shaded mask, either:
	 * - will be stored for future drag&drop 
	 * - will directly shift to a new range
	 *
	 * @param {Object} e Mouse event
	 * @param {Number} index Index of a mask in Navigator.shades array
	 */
	shadesMousedown: function (e, index) {
		e = this.chart.pointer.normalize(e);

		var navigator = this,
			chart = navigator.chart,
			xAxis = navigator.xAxis,
			zoomedMin = navigator.zoomedMin,
			navigatorLeft = navigator.navigatorLeft,
			navigatorWidth = navigator.navigatorWidth,
			range = navigator.range,
			chartX = e.chartX,
			fixedMax,
			ext,
			left;

		// For inverted chart, swap some options:
		if (chart.inverted) {
			chartX = e.chartY;
			navigatorLeft = navigator.top;
			navigatorWidth = navigator.navigatorHeight;
		}

		if (index === 1) {
			// Store information for drag&drop
			navigator.grabbedCenter = chartX;
			navigator.fixedWidth = range;
			navigator.dragOffset = chartX - zoomedMin;
		} else {
			// Shift the range by clicking on shaded areas
			left = chartX - navigatorLeft - range / 2;
			if (index === 0) {
				left = Math.max(0, left);
			} else if (index === 2 && left + range >= navigatorWidth) {
				left = navigatorWidth - range;
				fixedMax = navigator.getUnionExtremes().dataMax; // #2293, #3543
			}
			if (left !== zoomedMin) { // it has actually moved
				navigator.fixedWidth = range; // #1370

				ext = xAxis.toFixedRange(left, left + range, null, fixedMax);
				chart.xAxis[0].setExtremes(
					Math.min(ext.min, ext.max),
					Math.max(ext.min, ext.max),
					true,
					null, // auto animation
					{ trigger: 'navigator' }
				);
			}
		}
	},

	/**
	 * Mousedown on a handle mask.
	 * Will store necessary information for drag&drop.
	 *
	 * @param {Object} e Mouse event
	 * @param {Number} index Index of a handle in Navigator.handles array
	 */
	handlesMousedown: function (e, index) {
		e = this.chart.pointer.normalize(e);

		var scroller = this,
			chart = scroller.chart,
			baseXAxis = chart.xAxis[0];

		if (index === 0) {
			// Grab the left handle
			scroller.grabbedLeft = true;
			scroller.otherHandlePos = scroller.zoomedMax;
			scroller.fixedExtreme = baseXAxis.max;
		} else {
			// Grab the right handle
			scroller.grabbedRight = true;
			scroller.otherHandlePos = scroller.zoomedMin;
			scroller.fixedExtreme = baseXAxis.min;
		}

		chart.fixedRange = null;
	},
	/**
	 * Mouse move event based on x/y mouse position.
	 * @param {Object} e Mouse event
	 */
	onMouseMove: function (e) {
		var navigator = this,
			chart = navigator.chart,
			navigatorLeft = navigator.navigatorLeft,
			navigatorWidth = navigator.navigatorWidth,
			range = navigator.range,
			dragOffset = navigator.dragOffset,
			inverted = chart.inverted,
			chartX;


		// In iOS, a mousemove event with e.pageX === 0 is fired when holding the finger
		// down in the center of the scrollbar. This should be ignored.
		if (!e.touches || e.touches[0].pageX !== 0) { // #4696, scrollbar failed on Android

			e = chart.pointer.normalize(e);
			chartX = e.chartX;

			// Swap some options for inverted chart
			if (inverted) {
				navigatorLeft = navigator.top;
				navigatorWidth = navigator.navigatorHeight;
				chartX = e.chartY;
			}

			// Drag left handle or top handle
			if (navigator.grabbedLeft) {
				navigator.hasDragged = true;
				navigator.render(0, 0, chartX - navigatorLeft, navigator.otherHandlePos);
			// Drag right handle or bottom handle
			} else if (navigator.grabbedRight) {
				navigator.hasDragged = true;
				navigator.render(0, 0, navigator.otherHandlePos, chartX - navigatorLeft);
			// Drag scrollbar or open area in navigator
			} else if (navigator.grabbedCenter) {
				navigator.hasDragged = true;
				if (chartX < dragOffset) { // outside left
					chartX = dragOffset;
				} else if (chartX > navigatorWidth + dragOffset - range) { // outside right
					chartX = navigatorWidth + dragOffset - range;
				}

				navigator.render(0, 0, chartX - dragOffset, chartX - dragOffset + range);
			}
			if (navigator.hasDragged && navigator.scrollbar && navigator.scrollbar.options.liveRedraw) {
				e.DOMType = e.type; // DOMType is for IE8 because it can't read type async
				setTimeout(function () {
					navigator.onMouseUp(e);
				}, 0);
			}
		}
	},

	/**
	 * Mouse up event based on x/y mouse position.
	 * @param {Object} e Mouse event
	 */
	onMouseUp: function (e) {
		var navigator = this,
			chart = navigator.chart,
			xAxis = navigator.xAxis,
			fixedMin,
			fixedMax,
			ext,
			DOMEvent = e.DOMEvent || e;

		if (navigator.hasDragged || e.trigger === 'scrollbar') {
			// When dragging one handle, make sure the other one doesn't change
			if (navigator.zoomedMin === navigator.otherHandlePos) {
				fixedMin = navigator.fixedExtreme;
			} else if (navigator.zoomedMax === navigator.otherHandlePos) {
				fixedMax = navigator.fixedExtreme;
			}
			// Snap to right edge (#4076)
			if (navigator.zoomedMax === navigator.navigatorWidth) {
				fixedMax = navigator.getUnionExtremes().dataMax;
			}
			ext = xAxis.toFixedRange(navigator.zoomedMin, navigator.zoomedMax, fixedMin, fixedMax);
			if (defined(ext.min)) {
				chart.xAxis[0].setExtremes(
					ext.min,
					ext.max,
					true,
					navigator.hasDragged ? false : null, // Run animation when clicking buttons, scrollbar track etc, but not when dragging handles or scrollbar
					{
						trigger: 'navigator',
						triggerOp: 'navigator-drag',
						DOMEvent: DOMEvent // #1838
					}
				);
			}
		}

		if (e.DOMType !== 'mousemove') {
			navigator.grabbedLeft = navigator.grabbedRight = navigator.grabbedCenter = navigator.fixedWidth =
				navigator.fixedExtreme = navigator.otherHandlePos = navigator.hasDragged = navigator.dragOffset = null;
		}
	},

	/**
	 * Removes the event handlers attached previously with addEvents.
	 */
	removeEvents: function () {
		if (this.eventsToUnbind) {
			each(this.eventsToUnbind, function (unbind) {
				unbind();
			});
			this.eventsToUnbind = undefined;
		}
		this.removeBaseSeriesEvents();
	},

	removeBaseSeriesEvents: function () {
		var baseSeries = this.baseSeries || [];
		if (this.navigatorEnabled && baseSeries[0] && this.navigatorOptions.adaptToUpdatedData !== false) {
			each(baseSeries, function (series) {
				removeEvent(series, 'updatedData', this.updatedDataHandler);	
			}, this);

			// We only listen for extremes-events on the first baseSeries
			if (baseSeries[0].xAxis) {
				removeEvent(baseSeries[0].xAxis, 'foundExtremes', this.modifyBaseAxisExtremes);
			}
		}
	},

	/**
	 * Initiate the Navigator object
	 */
	init: function (chart) {
		var chartOptions = chart.options,
			navigatorOptions = chartOptions.navigator,
			navigatorEnabled = navigatorOptions.enabled,
			scrollbarOptions = chartOptions.scrollbar,
			scrollbarEnabled = scrollbarOptions.enabled,
			height = navigatorEnabled ? navigatorOptions.height : 0,
			scrollbarHeight = scrollbarEnabled ? scrollbarOptions.height : 0;

		this.handles = [];
		this.shades = [];

		this.chart = chart;
		this.setBaseSeries();

		this.height = height;
		this.scrollbarHeight = scrollbarHeight;
		this.scrollbarEnabled = scrollbarEnabled;
		this.navigatorEnabled = navigatorEnabled;
		this.navigatorOptions = navigatorOptions;
		this.scrollbarOptions = scrollbarOptions;
		this.outlineHeight = height + scrollbarHeight;

		var scroller = this,
			baseSeries = scroller.baseSeries,
			xAxisIndex = chart.xAxis.length,
			yAxisIndex = chart.yAxis.length,
			baseXaxis = baseSeries && baseSeries[0] && baseSeries[0].xAxis || chart.xAxis[0];

		// Make room for the navigator, can be placed around the chart:
		chart.extraMargin = {
			type: navigatorOptions.opposite ? 'plotTop' : 'marginBottom',
			value: scroller.outlineHeight + navigatorOptions.margin
		};
		if (chart.inverted) {
			chart.extraMargin.type = navigatorOptions.opposite ? 'marginRight' : 'plotLeft';
		}
		chart.isDirtyBox = true;

		if (scroller.navigatorEnabled) {
			// an x axis is required for scrollbar also
			scroller.xAxis = new Axis(chart, merge({
				// inherit base xAxis' break and ordinal options
				breaks: baseXaxis.options.breaks,
				ordinal: baseXaxis.options.ordinal
			}, navigatorOptions.xAxis, {
				id: 'navigator-x-axis',
				yAxis: 'navigator-y-axis',
				isX: true,
				type: 'datetime',
				index: xAxisIndex,
				offset: 0,
				keepOrdinalPadding: true, // #2436
				startOnTick: false,
				endOnTick: false,
				minPadding: 0,
				maxPadding: 0,
				zoomEnabled: false
			}, chart.inverted ? {
				offsets: [scrollbarHeight, 0, -scrollbarHeight, 0],
				width: height
			} : {
				offsets: [0, -scrollbarHeight, 0, scrollbarHeight],
				height: height
			}));

			scroller.yAxis = new Axis(chart, merge(navigatorOptions.yAxis, {
				id: 'navigator-y-axis',
				alignTicks: false,
				offset: 0,
				index: yAxisIndex,
				zoomEnabled: false
			}, chart.inverted ? {
				width: height
			} : {
				height: height
			}));

			// If we have a base series, initialize the navigator series
			if (baseSeries || navigatorOptions.series.data) {
				scroller.addBaseSeries();

			// If not, set up an event to listen for added series
			} else if (chart.series.length === 0) {

				wrap(chart, 'redraw', function (proceed, animation) {
					// We've got one, now add it as base and reset chart.redraw
					if (chart.series.length > 0 && !scroller.series) {
						scroller.setBaseSeries();
						chart.redraw = proceed; // reset
					}
					proceed.call(chart, animation);
				});
			}

		// in case of scrollbar only, fake an x axis to get translation
		} else {
			scroller.xAxis = {
				translate: function (value, reverse) {
					var axis = chart.xAxis[0],
						ext = axis.getExtremes(),
						scrollTrackWidth = chart.plotWidth - 2 * scrollbarHeight,
						min = numExt('min', axis.options.min, ext.dataMin),
						valueRange = numExt('max', axis.options.max, ext.dataMax) - min;

					return reverse ?
						// from pixel to value
						(value * valueRange / scrollTrackWidth) + min :
						// from value to pixel
						scrollTrackWidth * (value - min) / valueRange;
				},
				toFixedRange: Axis.prototype.toFixedRange,
				fake: true
			};
		}


		// Initialize the scrollbar
		if (chart.options.scrollbar.enabled) {
			chart.scrollbar = scroller.scrollbar = new Scrollbar(
				chart.renderer,
				merge(chart.options.scrollbar, { 
					margin: scroller.navigatorEnabled ? 0 : 10,
					vertical: chart.inverted
				}),
				chart
			);
			addEvent(scroller.scrollbar, 'changed', function (e) {
				var range = chart.inverted ? scroller.navigatorHeight : scroller.navigatorWidth,
					to = range * this.to,
					from = range * this.from;

				scroller.hasDragged = scroller.scrollbar.hasDragged;
				scroller.render(0, 0, from, to);

				if (chart.options.scrollbar.liveRedraw || e.DOMType !== 'mousemove') {
					setTimeout(function () {
						scroller.onMouseUp(e);
					});
				}
			});
		}

		// Render items, so we can bind events to them:
		scroller.renderElements();
		// Add data events
		scroller.addBaseSeriesEvents();
		// Add mouse events
		scroller.addMouseEvents();
	},

	/**
	 * Get the union data extremes of the chart - the outer data extremes of the base
	 * X axis and the navigator axis.
	 */
	getUnionExtremes: function (returnFalseOnNoBaseSeries) {
		var baseAxis = this.chart.xAxis[0],
			navAxis = this.xAxis,
			navAxisOptions = navAxis.options,
			baseAxisOptions = baseAxis.options,
			ret;

		if (!returnFalseOnNoBaseSeries || baseAxis.dataMin !== null) {
			ret = {
				dataMin: pick( // #4053
					navAxisOptions && navAxisOptions.min,
					numExt(
						'min',
						baseAxisOptions.min,
						baseAxis.dataMin,
						navAxis.dataMin,
						navAxis.min
					)
				),
				dataMax: pick(
					navAxisOptions && navAxisOptions.max,
					numExt(
						'max',
						baseAxisOptions.max,
						baseAxis.dataMax,
						navAxis.dataMax,
						navAxis.max
					)
				)
			};
		}
		return ret;
	},

	/**
	 * Set the base series. With a bit of modification we should be able to make
	 * this an API method to be called from the outside
	 */
	setBaseSeries: function (baseSeriesOptions) {
		var chart = this.chart,
			baseSeries = this.baseSeries = [];

		baseSeriesOptions = baseSeriesOptions || chart.options && chart.options.navigator.baseSeries || 0;

		// If we're resetting, remove the existing series
		if (this.series) {
			this.removeBaseSeriesEvents();
			each(this.series, function (s) { 
				s.destroy();
			});
		}

		// Iterate through series and add the ones that should be shown in navigator
		each(chart.series || [], function (series, i) {
			if (series.options.showInNavigator || (i === baseSeriesOptions || series.options.id === baseSeriesOptions) &&
					series.options.showInNavigator !== false) {
				baseSeries.push(series);
			}
		});

		// When run after render, this.xAxis already exists
		if (this.xAxis && !this.xAxis.fake) {
			this.addBaseSeries();
		}
	},

	addBaseSeries: function () {
		var navigator = this,
			chart = navigator.chart,
			navigatorSeries = navigator.series = [],
			baseSeries = navigator.baseSeries,
			baseOptions,
			mergedNavSeriesOptions,
			chartNavigatorOptions = navigator.navigatorOptions.series,
			baseNavigatorOptions,
			navSeriesMixin = {
				enableMouseTracking: false,
				group: 'nav', // for columns
				padXAxis: false,
				xAxis: 'navigator-x-axis',
				yAxis: 'navigator-y-axis',
				showInLegend: false,
				stacking: false, // #4823
				isInternal: true,
				visible: true
			};

		// Go through each base series and merge the options to create new series
		if (baseSeries) {
			each(baseSeries, function (base, i) {
				navSeriesMixin.name = 'Navigator ' + (i + 1);

				baseOptions = base.options || {};
				baseNavigatorOptions = baseOptions.navigatorOptions || {};
				mergedNavSeriesOptions = merge(baseOptions, navSeriesMixin, chartNavigatorOptions, baseNavigatorOptions);

				// Merge data separately. Do a slice to avoid mutating the navigator options from base series (#4923).
				var navigatorSeriesData = baseNavigatorOptions.data || chartNavigatorOptions.data;
				navigator.hasNavigatorData = navigator.hasNavigatorData || !!navigatorSeriesData;
				mergedNavSeriesOptions.data = navigatorSeriesData || baseOptions.data && baseOptions.data.slice(0);

				// Add the series
				base.navigatorSeries = chart.initSeries(mergedNavSeriesOptions);
				navigatorSeries.push(base.navigatorSeries);
			});
		} else {
			// No base series, build from mixin and chart wide options
			mergedNavSeriesOptions = merge(chartNavigatorOptions, navSeriesMixin);
			mergedNavSeriesOptions.data = chartNavigatorOptions.data;
			navigator.hasNavigatorData = !!mergedNavSeriesOptions.data;
			navigatorSeries.push(chart.initSeries(mergedNavSeriesOptions));
		}

		this.addBaseSeriesEvents();
	},

	addBaseSeriesEvents: function () {
		var scroller = this,
			baseSeries = scroller.baseSeries || [];

		// Bind modified extremes event to first base's xAxis only. In event of > 1 base-xAxes, the navigator will ignore those.
		if (baseSeries[0] && baseSeries[0].xAxis) {
			addEvent(baseSeries[0].xAxis, 'foundExtremes', this.modifyBaseAxisExtremes);
		}

		if (this.navigatorOptions.adaptToUpdatedData !== false) {
			// Respond to updated data in the base series.
			// Abort if lazy-loading data from the server.
			each(baseSeries, function (base) {
				if (base.xAxis) {
					addEvent(base, 'updatedData', this.updatedDataHandler);
					// Survive Series.update()
					base.userOptions.events = extend(base.userOptions.event, { updatedData: this.updatedDataHandler });
				}

				// Handle series removal
				addEvent(base, 'remove', function () {
					if (this.navigatorSeries) {
						erase(scroller.series, this.navigatorSeries);
						this.navigatorSeries.remove();
						delete this.navigatorSeries;
					}
				});		
			}, this);
		}
	},

	/**
	 * Set the scroller x axis extremes to reflect the total. The navigator extremes
	 * should always be the extremes of the union of all series in the chart as
	 * well as the navigator series.
	 */
	modifyNavigatorAxisExtremes: function () {
		var xAxis = this.xAxis,
			unionExtremes;

		if (xAxis.getExtremes) {
			unionExtremes = this.getUnionExtremes(true);
			if (unionExtremes && (unionExtremes.dataMin !== xAxis.min || unionExtremes.dataMax !== xAxis.max)) {
				xAxis.min = unionExtremes.dataMin;
				xAxis.max = unionExtremes.dataMax;
			}
		}
	},

	/**
	 * Hook to modify the base axis extremes with information from the Navigator
	 */
	modifyBaseAxisExtremes: function () {
		var baseXAxis = this,
			scroller = baseXAxis.chart.scroller,
			baseExtremes = baseXAxis.getExtremes(),
			baseMin = baseExtremes.min,
			baseMax = baseExtremes.max,
			baseDataMin = baseExtremes.dataMin,
			baseDataMax = baseExtremes.dataMax,
			range = baseMax - baseMin,
			stickToMin = scroller.stickToMin,
			stickToMax = scroller.stickToMax,
			newMax,
			newMin,
			navigatorSeries = scroller.series && scroller.series[0],
			hasSetExtremes = !!baseXAxis.setExtremes,

			// When the extremes have been set by range selector button, don't stick to min or max.
			// The range selector buttons will handle the extremes. (#5489)
			unmutable = baseXAxis.eventArgs && baseXAxis.eventArgs.trigger === 'rangeSelectorButton';

		if (!unmutable) {
		
			// If the zoomed range is already at the min, move it to the right as new data
			// comes in
			if (stickToMin) {
				newMin = baseDataMin;
				newMax = newMin + range;
			}

			// If the zoomed range is already at the max, move it to the right as new data
			// comes in
			if (stickToMax) {
				newMax = baseDataMax;
				if (!stickToMin) { // if stickToMin is true, the new min value is set above
					newMin = Math.max(newMax - range, navigatorSeries && navigatorSeries.xData ? navigatorSeries.xData[0] : -Number.MAX_VALUE);
				}
			}

			// Update the extremes
			if (hasSetExtremes && (stickToMin || stickToMax)) {
				if (isNumber(newMin)) {
					baseXAxis.min = baseXAxis.userMin = newMin;
					baseXAxis.max = baseXAxis.userMax = newMax;
				}
			}
		}

		// Reset
		scroller.stickToMin = scroller.stickToMax = null;
	},

	/**
	 * Handler for updated data on the base series. When data is modified, the navigator series
	 * must reflect it. This is called from the Chart.redraw function before axis and series
	 * extremes are computed.
	 */
	updatedDataHandler: function () {
		var scroller = this.chart.scroller,
			baseSeries = this,
			navigatorSeries = this.navigatorSeries;

		// Detect whether the zoomed area should stick to the minimum or maximum. If the current
		// axis minimum falls outside the new updated dataset, we must adjust.
		scroller.stickToMin = isNumber(baseSeries.xAxis.min) && (baseSeries.xAxis.min <= baseSeries.xData[0]);
		// If the scrollbar is scrolled all the way to the right, keep right as new data 
		// comes in.
		scroller.stickToMax = Math.round(scroller.zoomedMax) >= Math.round(scroller.navigatorWidth);

		// Set the navigator series data to the new data of the base series
		if (navigatorSeries && !scroller.hasNavigatorData) {
			navigatorSeries.options.pointStart = baseSeries.xData[0];
			navigatorSeries.setData(baseSeries.options.data, false, null, false); // #5414
		}
	},

	/**
	 * Destroys allocated elements.
	 */
	destroy: function () {

		// Disconnect events added in addEvents
		this.removeEvents();

		if (this.xAxis) {
			erase(this.chart.xAxis, this.xAxis);
			erase(this.chart.axes, this.xAxis);
		}
		if (this.yAxis) {
			erase(this.chart.yAxis, this.yAxis);
			erase(this.chart.axes, this.yAxis);
		}
		// Destroy series
		each(this.series || [], function (s) {
			if (s.destroy) {
				s.destroy();
			}
		});

		// Destroy properties
		each(['series', 'xAxis', 'yAxis', 'shades', 'outline', 'scrollbarTrack',
				'scrollbarRifles', 'scrollbarGroup', 'scrollbar', 'navigatorGroup', 'rendered'], function (prop) {
			if (this[prop] && this[prop].destroy) {
				this[prop].destroy();
			}
			this[prop] = null;
		}, this);

		// Destroy elements in collection
		each([this.handles], function (coll) {
			destroyObjectProperties(coll);
		}, this);
	}
};

H.Navigator = Navigator;

/**
 * For Stock charts, override selection zooming with some special features because
 * X axis zooming is already allowed by the Navigator and Range selector.
 */
wrap(Axis.prototype, 'zoom', function (proceed, newMin, newMax) {
	var chart = this.chart,
		chartOptions = chart.options,
		zoomType = chartOptions.chart.zoomType,
		previousZoom,
		navigator = chartOptions.navigator,
		rangeSelector = chartOptions.rangeSelector,
		ret;

	if (this.isXAxis && ((navigator && navigator.enabled) ||
			(rangeSelector && rangeSelector.enabled))) {

		// For x only zooming, fool the chart.zoom method not to create the zoom button
		// because the property already exists
		if (zoomType === 'x') {
			chart.resetZoomButton = 'blocked';

		// For y only zooming, ignore the X axis completely
		} else if (zoomType === 'y') {
			ret = false;

		// For xy zooming, record the state of the zoom before zoom selection, then when
		// the reset button is pressed, revert to this state
		} else if (zoomType === 'xy') {
			previousZoom = this.previousZoom;
			if (defined(newMin)) {
				this.previousZoom = [this.min, this.max];
			} else if (previousZoom) {
				newMin = previousZoom[0];
				newMax = previousZoom[1];
				delete this.previousZoom;
			}
		}

	}
	return ret !== undefined ? ret : proceed.call(this, newMin, newMax);
});

// Initialize scroller for stock charts
wrap(Chart.prototype, 'init', function (proceed, options, callback) {

	addEvent(this, 'beforeRender', function () {
		var options = this.options;
		if (options.navigator.enabled || options.scrollbar.enabled) {
			this.scroller = this.navigator = new Navigator(this);
		}
	});

	proceed.call(this, options, callback);

});

/**
 * For stock charts, extend the Chart.setChartSize method so that we can set the final top position
 * of the navigator once the height of the chart, including the legend, is determined. #367.
 * We can't use Chart.getMargins, because labels offsets are not calculated yet.
 */
wrap(Chart.prototype, 'setChartSize', function (proceed) {

	var legend = this.legend,
		scroller = this.scroller,
		legendOptions,
		xAxis,
		yAxis;

	proceed.apply(this, [].slice.call(arguments, 1));

	if (scroller) {
		legendOptions = legend.options;
		xAxis = scroller.xAxis;
		yAxis = scroller.yAxis;

		// Compute the top position
		if (this.inverted) {
			scroller.left = scroller.navigatorOptions.opposite ? 
				this.chartWidth - scroller.scrollbarHeight - scroller.height : 
				this.spacing[3] + scroller.scrollbarHeight;
			scroller.top = this.plotTop + scroller.scrollbarHeight;
		} else {
			scroller.left = this.plotLeft;
			scroller.top = scroller.navigatorOptions.top ||
				this.chartHeight - scroller.height - scroller.scrollbarHeight - this.spacing[2] -
					(legendOptions.verticalAlign === 'bottom' && legendOptions.enabled && !legendOptions.floating ?
						legend.legendHeight + pick(legendOptions.margin, 10) : 0);
		}

		if (xAxis && yAxis) { // false if navigator is disabled (#904)

			if (this.inverted) {
				xAxis.options.left = yAxis.options.left = scroller.left;
			} else {
				xAxis.options.top = yAxis.options.top = scroller.top;
			}

			xAxis.setAxisSize();
			yAxis.setAxisSize();
		}
	}
});

// Pick up badly formatted point options to addPoint
wrap(Series.prototype, 'addPoint', function (proceed, options, redraw, shift, animation) {
	var turboThreshold = this.options.turboThreshold;
	if (turboThreshold && this.xData.length > turboThreshold && isObject(options, true) && this.chart.scroller) {
		error(20, true);
	}
	proceed.call(this, options, redraw, shift, animation);
});

// Handle adding new series
wrap(Chart.prototype, 'addSeries', function (proceed, options, redraw, animation) {
	var series = proceed.call(this, options, false, animation);
	if (this.scroller) {
		this.scroller.setBaseSeries(); // Recompute which series should be shown in navigator, and add them
	}
	if (pick(redraw, true)) {
		this.redraw();
	}
	return series;
});

// Handle updating series
wrap(Series.prototype, 'update', function (proceed, newOptions, redraw) {
	proceed.call(this, newOptions, false);
	if (this.chart.scroller) {
		this.chart.scroller.setBaseSeries();
	}
	if (pick(redraw, true)) {
		this.chart.redraw();
	}
});

/* ****************************************************************************
 * End Navigator code														  *
 *****************************************************************************/
