
 /* global $, window */
var RootNode = require('./RootNode.js'),
 SIGNAL = require('../model/Messages').MonitorsHandler.SIGNAL,
 _ = require('underscore'),
 DetailView = require('../view/events-views/detailed/Controller.js'),
 FusionDialog = require('../view/events-views/fusion/Controller.js');

var TreeMap = module.exports = function (model) {
  this.model = model;
  this.dialog = null;
  this.detailedView = null;
  this.focusedStreams = null;
  var $tree = $('#tree');
  this.root = new RootNode(this, $tree.width() -
    parseInt($tree.css('margin-left').split('px')[0], null) -
    parseInt($tree.css('margin-right').split('px')[0], null),
    $tree.height() -
    parseInt($tree.css('margin-bottom').split('px')[0], null) -
    parseInt($tree.css('margin-top').split('px')[0], null));
  this.root.x =  parseInt($tree.css('margin-left').split('px')[0], null);
  this.root.y =  parseInt($tree.css('margin-top').split('px')[0], null);

  $('#logo-reload').click(function () {
    this.focusOnStreams(null);
  }.bind(this));
  var refreshTree = _.throttle(function () {
    var start = new Date().getTime();
    this.root._generateChildrenTreemap(this.root.x,
      this.root.y,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
    this.root.renderView(true);
    this.model.updateTimeFrameLimits();
    var end = new Date().getTime();
    var time = end - start;
    console.log('refreshTree execution:', time);
  }.bind(this), 10);

  $(window).resize(_.debounce(function () {
    var $tree = $('#tree');
    this.root.width = $tree.width() -
      parseInt($tree.css('margin-left').split('px')[0], null) -
      parseInt($tree.css('margin-right').split('px')[0], null);
    this.root.height = $tree.height() -
      parseInt($tree.css('margin-bottom').split('px')[0], null) -
      parseInt($tree.css('margin-top').split('px')[0], null);
    this.root.x =  parseInt($tree.css('margin-left').split('px')[0], null);
    this.root.y =  parseInt($tree.css('margin-top').split('px')[0], null);
    this.root._createView();
    this.root._generateChildrenTreemap(this.root.x,
      this.root.y,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
    this.root.renderView(true);
  }.bind(this), 100));


  //----------- init the model with all events --------//
  this.eventEnterScope = function (content) {
    console.log('eventEnter', content);
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      this.root.eventEnterScope(event, content.reason, function () {});
    }, this);
    this.root._createView();
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventEnter execution:', time);
    refreshTree();
  }.bind(this);

  this.eventLeaveScope = function (content) {
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      this.root.eventLeaveScope(event, content.reason, function () {});
    }, this);
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventLeave execution:', time);
    refreshTree();
  }.bind(this);

  this.eventChange = function (content) {
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      this.root.eventChange(event, content.reason, function () {});
    }, this);
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventChange execution:', time);
    refreshTree();
  }.bind(this);

  this.model.activeFilter.triggerForAllCurrentEvents(this.eventEnterScope);
  //--------- register the TreeMap event Listener ----------//
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_ENTER,
    this.eventEnterScope
  );
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_LEAVE,
    this.eventLeaveScope);
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_CHANGE,
    this.eventChange);
};
TreeMap.prototype.focusOnStreams = function (stream) {
  this.model.activeFilter.focusOnStreams(stream);
  this.setFocusedStreams(stream);
};
TreeMap.prototype.setFocusedStreams = function (stream) {
  this.focusedStreams = stream;
};
TreeMap.prototype.getFocusedStreams = function () {
  return this.focusedStreams;
};
TreeMap.prototype.onDateHighLighted = function (time) {
  if (this.root) {
    this.root.onDateHighLighted(time);
  }
};

TreeMap.prototype.destroy = function () {
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_SCOPE_ENTER,
    this.eventEnterScope);
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_SCOPE_LEAVE,
    this.eventLeaveScope);
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_CHANGE,
    this.eventChange);
};


 /** The treemap's utility functions **/

 /**
  * Search for the node matching the arguments and returns it.
  * @param nodeId the unique id in the DOM of the node
  * @param streamId  the unique id of the stream associated with the node
  * @param connectionId the unique id of the connection associated with the node
  * @returns {find|*} returns the uniquely identifiable by the passed arguments
  */
TreeMap.prototype.getNodeById = function (nodeId, streamId, connectionId) {
  var node = this.root;
  node = node.connectionNodes[connectionId];
  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by connection' +
      connectionId);
  }
  node = node.streamNodes[streamId];
  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by stream' +
      connectionId + streamId);
  }
  var that = _.find(node.getChildren(), function (node) { return node.uniqueId === nodeId; });

  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by nodeId' +
      connectionId + ' ' + streamId + ' ' + nodeId);
  }
  return that;
};


 /**
  * Sets up all the controlling to aggregate two nodes.
  * @param node1 the first node
  * @param node2 the second node
  */
TreeMap.prototype.requestAggregationOfNodes = function (node1, node2) {
  var events = { };
  var attrname = null;
  for (attrname in node1.events) {
    if (node1.events.hasOwnProperty(attrname)) {
      events[attrname] = node1.events[attrname];
    }
  }
  for (attrname in node2.events) {
    if (node2.events.hasOwnProperty(attrname)) {
      events[attrname] = node2.events[attrname];
    }
  }
  this.dialog = new FusionDialog($('#pryv-modal').on('hidden.bs.modal', function () {
    if (this.dialog) {
      this.dialog.close();
      this.dialog = null;
    }
  }.bind(this)), events);
  this.dialog.show();
};
 //======== Detailed View ========\\
TreeMap.prototype.initDetailedView = function ($modal, events, highlightedTime) {

  if (!this.hasDetailedView()) {
    this.detailedView = new DetailView($modal);
  }
  this.addEventsDetailedView(events);
  this.showDetailedView();
  this.highlightDateDetailedView(highlightedTime);

};

TreeMap.prototype.hasDetailedView = function () {
  return typeof this.detailedView !== 'undefined' && this.detailedView !== null;
};
TreeMap.prototype.showDetailedView = function () {
  if (this.hasDetailedView()) {
    this.detailedView.show();
  }
};
TreeMap.prototype.closeDetailedView = function () {
  if (this.hasDetailedView()) {
    this.detailedView.close();
    this.detailedView = null;
  }
};
TreeMap.prototype.addEventsDetailedView = function (events) {
  if (this.hasDetailedView()) {
    this.detailedView.addEvents(events);
  }
};
TreeMap.prototype.deleteEventDetailedView = function (event) {
  if (this.hasDetailedView()) {
    this.detailedView.deleteEvent(event);
  }
};
TreeMap.prototype.updateEventDetailedView = function (event) {
  if (this.hasDetailedView()) {
    this.detailedView.updateEvent(event);
  }
};
TreeMap.prototype.highlightDateDetailedView = function (time) {
  if (this.hasDetailedView()) {
    this.detailedView.highlightDate(time);
  }
};
/*=================================*/

/* jshint -W098 */

 /**
  * Creates a virtual node from a certain number of events.
  * @param events is an array of events you want to fuse, aka show in the same node.
  */
TreeMap.prototype.createVirtualNode = function (events) {
  /* TODO:
   * create the node, don't remove the already existing
   * make sure the update follows at both places
   */

};


 /**
  * Remove a existing virtual node.
  * @param node the virtual node you want to remove
  */
TreeMap.prototype.removeVirtualNode = function (node) {
  /* TODO:
   * just remove the indicated node
   */
};

