/* global $, window */
var _ = require('underscore'),
  Collection = require('./EventCollection.js'),
  Model = require('./EventModel.js'),
  ListView = require('./ListView.js'),
  SingleView = require('./SingleView.js'),
  FinalView = require('./FinalView.js');

var Controller = module.exports = function ($modal, events) {
  //console.log('lalal');
  this.events = {};
  this.eventsToAdd = [];
  this.collection = null;
  this.highlightedDate = null;
  this.listView = null;
  this.singleView = null;
  this.finalView = null;
  this.$modal = $modal;

  // Create the two div for the single and final view
  $('#modal-left-content')
    .html('<div id="modal-left-content-single"></div><div id="modal-left-content-final"></div>');


  this.debounceAdd = _.debounce(function () {
    this.collection.add(this.eventsToAdd, {sort: false});
    this.collection.sort();
    this.eventsToAdd = [];
    if (this.highlightedDate) {
      this.highlightDate(this.highlightedDate);
    }
  }.bind(this), 100);


  this.testf = _.debounce(function () {
    var elem = this.collection.at(0);
    //console.log('Debounce show first', this.collection);
    this.updateSingleView(elem);
    //this.updateSingleView(this.collection.at(0));
  }.bind(this), 2000);


  var formatted = _.reduce(events, function (output, el) {
    var graphName = el.connection.id + '/' + el.streamId + '/' + el.type;
    if (! output[graphName]) {
      output[graphName] = {
        id: graphName,
        streamId: el.streamId,
        streamName: el.stream.name,
        connectionId: el.connection.id,
        type: el.type,
        elements: [],
        trashed: false,
        tags: el.tags
      };
    }
    output[graphName].elements.push({content: el.content, time: el.time});
    return output;
  }, {});

  //console.log(formatted);

  this.addEvents(formatted);

  $(window).resize(this.resizeModal);
};

_.extend(Controller.prototype, {

  show: function () {
    this.$modal.modal();
    if (!this.listView) {
      this.singleView = new SingleView({model: new Model({})});
      this.finalView = new FinalView({model: new Model({})});
      this.listView = new ListView({
        collection: this.collection
      });

      this.listView.on('itemview:chart:clicked', function (evt) {
        //console.log('ItemView - Event: Chart clicked');
        this.collection.setCurrentElement(evt.model);
        this.updateSingleView(this.collection.getCurrentElement());
      }.bind(this));

      this.listView.on('itemview:chart:select', function (evt) {
        this.addEventToFinalView(evt.model);
        //console.log('ItemView - Event: Chart selected');
      }.bind(this));

      this.listView.on('itemview:chart:unselect', function (evt) {
        this.removeEventFromFinalView(evt.model);
        //console.log('ItemView - Event: Chart unselected');
      }.bind(this));

      this.listView.on('singleview:chart:clicked', function (evt) {
        //this.removeEventFromFinalView(evt.model);
        //console.log('SingleView - Event: Chart clicked');
      }.bind(this));
    }

    //console.log('show - this collection', this.collection);


    this.testf();

    this.listView.render();
    this.singleView.render();
    this.finalView.render();
    this.resizeModal();
    $(this.$modal).keydown(function (e) {
      var LEFT_KEY = 37;
      var UP_KEY = 38;
      var RIGHT_KEY = 39;
      var DOWN_KEY = 40;
      if (e.which === LEFT_KEY || e.which === UP_KEY) {
        this.updateSingleView(this.collection.prev().getCurrentElement());
        return false;
      }
      if (e.which === RIGHT_KEY || e.which === DOWN_KEY) {
        this.updateSingleView(this.collection.next().getCurrentElement());
        return false;
      }
    }.bind(this));
  },
  close: function () {
    this.collection.reset();
    this.collection = null;
    this.events = {};
    $(this.$modal).unbind('keydown');
    $('#detail-div').empty();
  },
  getEventById: function (event) {
    return this.collection.getEventById(event.id);
  },
  addEvents: function (event) {
    //console.log('addEvents', 'init');
    if (!event) {
      //console.log('addEvents', 'no event');
      return;
    }
    if (event.id) {
      //console.log('addEvents', 'has id, is alone');
      //we have only one event so we put it on a each for the next each
      event = [event];
    }
    if (!this.collection) {
      //console.log('addEvents', 'now collection');
      this.collection = new Collection();
    }
    _.each(event, function (e) {
      //console.log('addEvents', e);
      var m = new Model({
        event: e,
        selected: false,
        chartType: 0
      });
      this.events[e.id] = e;
      this.eventsToAdd.push(m);
    }, this);

    //console.log('addEvents - showing the collection', this.collection);
    this.debounceAdd();
  },
  deleteEvent: function (event) {
    delete this.events[event.id];
    var toDelete = this.getEventById(event);
    if (toDelete) {
      toDelete.destroy();
    }
  },
  updateEvent: function (event) {
    this.events[event.id] = event;
    var toUpdate = this.getEventById(event);
    if (toUpdate) {
      toUpdate.set('event', event);
      this.collection.sort();
    }
  },
  highlightDate: function (time) {
    this.highlightedDate = time;
    var model = this.collection.highlightEvent(time);
    this.updateSingleView(model);

  },
  updateSingleView: function (model) {
    if (model) {
      this.singleView.model.set('event', model.get('event'));
    }
  },

  /**
   * Adds a serie from the final view
   * @param model the model of the serie to add
   */
  addEventToFinalView: function (model) {
    // events of the finalView model is an array
    // of the real events (containing the points)
    if (model) {
      var eventsFV = this.finalView.model.get('events'); // should be an array
      var events = [];
      if (eventsFV) {
        for (var i = 0; i < eventsFV.length; i++) {
          var updatedEvent = this.getEventById(eventsFV[i]);
          if (updatedEvent) {
            events.push(updatedEvent.get('event'));
          }
        }
      }
      events.push(model.get('event'));
      this.finalView.model.set('events', events);
    }
  },

  /**
   * Removes a serie from the final view
   * @param model the model of the serie to remove
   */
  removeEventFromFinalView: function (model) {
    if (model) {
      var eventsFV = this.finalView.model.get('events');
      var events = [];
      if (eventsFV) {
        for (var i = 0; i < eventsFV.length; ++i) {
          if (eventsFV[i].id !== model.get('event').id) {
            var updatedEvent = this.getEventById(eventsFV[i]);
            if (updatedEvent) {
              events.push(updatedEvent.get('event'));
            }
          }
        }
        this.finalView.model.set('events', events);
      }
    }
  },

  resizeModal: _.debounce(function () {
    $('.modal-panel-left').css({
      width: $('.modal-body').width() - $('.modal-panel-right').width(),
      height: $('.modal-body').height()
    });

    $('#modal-left-content').css({
      width: '98%',
      height: $('.modal-panel-left').height(),
      'margin-left': '1%',
      'margin-right': '1%'
    });

    $('#modal-left-content-single').css({
      width: $('.modal-panel-content').width(),
      height: '47%',
      'margin-top': '2%',
      'background-color': 'Khaki'
    });

    $('#modal-left-content-final').css({
      width: $('.modal-panel-content').width(),
      height: '47%',
      'margin-top': '2%',
      'background-color': 'LightSeaGreen'
    });


  }.bind(this), 1000)
});