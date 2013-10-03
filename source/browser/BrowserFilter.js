
var _ = require('underscore');
var Filter = require('pryv').Filter;

var Pryv = require('pryv');

Object.defineProperty(Pryv.Stream.prototype, 'serialId', {
  get: function () { return this.connection.serialId + '>>' + this.id; }
});
Object.defineProperty(Pryv.Event.prototype, 'serialId', {
  get: function () { return this.stream.serialId + '>>' + this.id; }
});


var BrowserFilter = module.exports = function (browser) {
  this.browser = browser;
  this._showOnlyStreams = null; // object that contains streams to display (from multiple connections)
  this.hiddenStreams = {};
  this.eventListeners = {};
  this._initEventListeners();
  this._showConnections = {}; // serialIds / connection

  this.currentEvents = {};

  this.tags = null;
  this._fromST = null;
  this._toST = null;
};

/**
 * Create ah-hoc filter for this connection
 * @private
 */
BrowserFilter.prototype._getFilterFor = function (/*connectionKey*/) {

  return nullFilter;
};
var nullFilter = new Filter({limit : 2000});





//----------------------- event management ----------------------//

BrowserFilter.SIGNAL = {
  STREAM : {},
  EVENT : {},
  BATCH : {}
};


BrowserFilter.UNREGISTER_LISTENER = 'unregisterMePlease';

/** called when a batch of changes is expected, content: <batchId> unique**/
BrowserFilter.SIGNAL.BATCH.BEGIN = 'beginBatch';
/** called when a batch of changes is done, content: <batchId> unique**/
BrowserFilter.SIGNAL.BATCH.DONE = 'doneBatch';

/** called when some streams are hidden, content: Array of Stream**/
BrowserFilter.SIGNAL.STREAM.HIDE = 'hideStream';
BrowserFilter.SIGNAL.STREAM.SHOW = 'hideShow';
/** called when some eventsEnterScope, content: {reason: one of .., content: array of Event }**/
BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER = 'eventEnterScope';
BrowserFilter.SIGNAL.EVENT.SCOPE_LEAVE = 'eventLeaveScope';
BrowserFilter.SIGNAL.EVENT.CHANGE = 'eventChange';

BrowserFilter.REASON = { EVENT : {
  SCOPE_ENTER : {},
  SCOPE_LEAVE : {}
} };

BrowserFilter.REASON.EVENT.SCOPE_ENTER.ADD_CONNECTION = 'connectionAdded';
BrowserFilter.REASON.EVENT.SCOPE_LEAVE.FOCUS_ON_STREAM = 'focusOnStream';
// may happend when several refresh requests overlaps
BrowserFilter.REASON.FORCE = 'forced';
/**
 * Init all event listeners array
 * @private
 */
BrowserFilter.prototype._initEventListeners = function () {
  _.each(_.keys(BrowserFilter.SIGNAL), function (namespace) {
    _.each(_.keys(BrowserFilter.SIGNAL[namespace]), function (key) {
      this.eventListeners[BrowserFilter.SIGNAL[namespace][key]] = [];
    }, this);
  }, this);
};



/**
 * Add an event listener
 * @param signal one of  BrowserFilter.SIGNAL.*.*
 * @param callback function(content) .. content vary on each signal.
 * If the callback returns BrowserFilter.UNREGISTER_LISTENER it will be removed from the listner
 * @return the callback function for further reference
 */
BrowserFilter.prototype.addEventListener = function (signal, callback) {
  this.eventListeners[signal].push(callback);
  return callback;
};


/**
 * remove the callback matching this signal
 */
BrowserFilter.prototype.removeEventListener = function (signal, callback) {
  for (var i = 0; i < this.eventListeners[signal].length; i++) {
    if (this.eventListeners[signal][i] === callback) {
      this.eventListeners[signal][i] = null;
    }
  }
};


/**
 * A changes occurred on the filter
 */
BrowserFilter.prototype.fireEvent = function (signal, content, thisArg) {
  console.log('BrowserFilter.FireEvent : ' + signal);
  _.each(this.eventListeners[signal], function (callback) {
    if (callback !== null &&
      BrowserFilter.UNREGISTER_LISTENER === callback.call(thisArg, content)) {
      this.removeEventListener(signal, callback);
    }
  }, this);
};


/**
 * start a batch process
 * @return an object where you have to call stop when done
 */
BrowserFilter.prototype.startBatch = function () {
  var batch = {
    id : (new Date()).getTime() + 'M',
    filter : this,
    done : function () {
      this.filter.fireEvent(BrowserFilter.SIGNAL.BATCH.DONE, this.id);
    }
  };
  this.fireEvent(BrowserFilter.SIGNAL.BATCH.BEGIN, batch.id);
  return batch;
};


// ----------------------------- EVENTS --------------------------- //

/**
 * Return true if this event matches the filter
 * @param stream object
 * @returns Boolean
 */
BrowserFilter.prototype.eventMatchesFilter = function (event) {
  return (
    this.streamMatchesFilter(event.stream)
    // TODO && TIME
    );
};

// ----------------------------- STREAMS -------------------------- //

/**
 * Return true if this stream matches the filter
 * @param stream object
 * @returns Boolean
 */
BrowserFilter.prototype.streamMatchesFilter = function (stream) {
  if (! this.connectionMatchesFilter(stream.connection)) { return false; }

  if (_.has(this.hiddenStreams, stream.serialId)) { return false; }
  if (! this._showOnlyStreams) { return true; }
  return _.has(this._showOnlyStreams, stream.serialId);
};

/**
 * The the streams to display
 * @param stream object or array of Streams (null) to show all
 * @returns Boolean
 */
BrowserFilter.prototype.showOnlyStreams = function (streams) {
  if (streams === null) {
    if (this._showOnlyStreams === null) { return; } // nothing to do
  }

  var streamsToLoad = []; // for streams that was not in before

  if (! streams) {
    this._showOnlyStreams = null;
  } else {
    if (!_.isArray(streams)) { streams = [streams]; }

    _.each(streams, function (stream) {

      if (! this.streamMatchesFilter(stream)) {
        streamsToLoad.push(stream);
      }

      if (_.has(this.hiddenStreams, stream.serialId)) {
        delete this.hiddenStreams[stream.serialId];
      }
      if (this._showOnlyStreams === null) {
        this._showOnlyStreams = {};
      }
      if (! _.has(this._showOnlyStreams, stream.serialId)) {
        this._showOnlyStreams[stream.serialId] = stream;
      }

    }, this);
  }


  this.refreshContent(BrowserFilter.REASON.EVENT.SCOPE_LEAVE.FOCUS_ON_STREAM);

};

BrowserFilter.prototype._refreshContentACTUAL = 0;
/**
 *
 * @param reason  one of BrowserFilter.REASON.*
 * @param focusOn  .. info for further optimization
 */
BrowserFilter.prototype.refreshContent = function (reason/*, focusOn*/) {
  if (BrowserFilter.prototype._refreshContentACTUAL > 0) {
    BrowserFilter.prototype._refreshContentACTUAL = 2; // will trigger a refresh an the end
    console.log('Skiping refresh request because already one on course ' + reason);
  }
  BrowserFilter.prototype._refreshContentACTUAL = 1;


  // we can process leaving events locally

  var eventsLeavingScope = [];
  // pass through all current events and remove the one not matching current Streams
  _.each(_.values(this.currentEvents), function (event) {
    if (! this.eventMatchesFilter(event)) {
      eventsLeavingScope.push(event);
      delete this.currentEvents[event.serialId];
    }
  }.bind(this));


  this.fireEvent(BrowserFilter.SIGNAL.EVENT.SCOPE_LEAVE,
    {reason: BrowserFilter.REASON.EVENT.SCOPE_LEAVE.FOCUS_ON_STREAM,
      events: eventsLeavingScope});


  var connectionsTodo = _.keys(this._showConnections).length;
  var that = this;
  function doneOneConnection(events) {
    var eventsMatchedFromModel = []; // used to check if events left form model
    var eventsEnteringScope = [];


    _.each(events, function (event) { // for each event

      if (! that.eventMatchesFilter(event)) {
        console.error('!! Error !! BrowserFilter.refreshContent, ' +
          ' got an event not matching the filter): ' + event.serialId);
      }

      if (_.has(that.currentEvents, event)) {
        eventsMatchedFromModel.push(event);
      } else {
        eventsEnteringScope.push(event);
        that.currentEvents[event.serialId] = event; // add to currently displayed events
      }

    });


    // ---------- OK DONE
    connectionsTodo--;
    if (connectionsTodo <= 0) {  // finished processing all connections
      // --- ################   ending
      // should we go for another loop?
      if (BrowserFilter.prototype._refreshContentACTUAL > 1) {
        console.log('Refreshing with force reason');
        BrowserFilter.prototype._refreshContentACTUAL = 0;
        that.refreshContent(BrowserFilter.REASON.FORCE);
      }
      BrowserFilter.prototype._refreshContentACTUAL = 0;
    }
  }

  // do we have new events ?
  _.each(_.keys(this._showConnections), function (connectionKey) { // for each connection
    this._getEventsForConnection(connectionKey, function (error, events) {  // get events


      doneOneConnection(events);

    }.bind(this));
  }.bind(this));






};

// ----------------------------- CONNECTIONS -------------------------- //


/**
 * get all events that match this filter
 */
BrowserFilter.prototype.showConnection = function (connectionKey) {
  if (_.has(this._showConnections, connectionKey)) {
    console.log('Warning BrowserFilter.showConnection, already activated: ' + connectionKey);
    return;
  }
  if (! this.browser.connections.get(connectionKey)) { // TODO error management
    console.log('BrowserFilter.showConnection cannot find connection: ' + connectionKey)
    return;
  }
  this._showConnections[connectionKey] = true;

  var self = this;
  this._getEventsForConnection(connectionKey,
    function (error, result) {
      if (error) { console.log(error); } // TODO handle

      var eventThatEnter = [];
      _.each(result, function (event) {
        if (! _.has(self.currentEvents, event.serialId)) {
          eventThatEnter.push(event);
          self.currentEvents[event.serialId] = event;
        }
      });

      self.fireEvent(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
        {reason: BrowserFilter.REASON.EVENT.SCOPE_ENTER.ADD_CONNECTION,
          events: result});
    }
  );
};

/**
 * return true if connection matches filter
 * @param eventListener
 */
BrowserFilter.prototype.connectionMatchesFilter = function (connection) {
   return _.has(this._showConnections, connection.serialId);
};




/**
 * get all events actually matching this filter
 */
BrowserFilter.prototype.triggerForAllCurrentEvents = function (eventListener) {
  eventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
    {reason: BrowserFilter.REASON.EVENT.SCOPE_ENTER.ADD_CONNECTION,
      events: _.values(this.currentEvents)});
};

BrowserFilter.prototype._getEventsForConnection = function (connectionKey, callback) {
  var self = this;
  self.browser.connections.get(connectionKey, function (error, connection) { // when ready
    if (error) { console.log(error); } // TODO handle
    connection.events.get(self._getFilterFor(connectionKey), null,   callback); // get events
  });
};
