
var ModelFilter = require('./model/ModelFilter.js');

var ConnectionsHandler = require('./model/ConnectionsHandler.js');

var TreeMap = require('./tree/TreeMap.js');
var Pryv = require('pryv');
var TimeLine = require('browser-timeline');

module.exports = function () {
  // create connection handler and filter
  this.connections = new ConnectionsHandler(this);
  this.activeFilter = new ModelFilter(this);
  this.timeView = new TimeLine();
  this.timeView.render();
  initTimeView(this.timeView);
  this.timeView.on('filtersChanged', this.onFiltersChanged, this);
  this.timeView.on('dateHighlighted', this.onDateHighlighted, this);
  this.timeView.on('dateMasked', this.onDateMasked, this);
  this.onFiltersChanged = function () {
    console.log('onFiltersChanged', arguments);
  };
  this.onDateHighlighted = function () {
    console.log('onDateHighlighted', arguments);
  };
  this.onDateMasked = function () {
    console.log('onDateMasked', arguments);
  };
  this.activeFilter.batchSet(
    {timeFrameST : [null, null],
      limit : 2000 });

  // add fredos to Connections
  var fredosSerial =
    this.connections.add((new Pryv.Connection('fredos71', 'VVTi1NMWDM')).useStaging());

  // tell the filter we want to show this connection
  this.activeFilter.addConnection(fredosSerial);

  // create the TreeMap
  this.treemap = new TreeMap(this);

  // create streams and add them to filter
  //this.connections.add(new Pryv.Connection('jordane', 'eTpAijAyD5'));
  var perki1Serial =
    this.connections.add((new Pryv.Connection('perkikiki', 'Ve-U8SCASM')).useStaging());
  var perki2Serial =
    this.connections.add((new Pryv.Connection('perkikiki', 'PVriN2MuJ9')).useStaging());

  // activate them in batch in the filter
  var batch = this.activeFilter.startBatch();
  this.activeFilter.addConnection(perki1Serial, batch);
  this.activeFilter.addConnection(perki2Serial, batch);
  batch.done();

  var streams = [];
  var perki1 =  this.connections.get(perki1Serial);
  perki1.useLocalStorage(function () {
    var stream =  perki1.streams.getById('TVWwwYo-mJ');
    streams.push(stream);
    setTimeout(function () {
      // this.activeFilter.focusOnStreams(streams);
    }.bind(this), 30000);
  }.bind(this));
};
var initTimeView = function (timeView) {
  var spanName = 'day',
    spanTime = 86400000,
    fromTime = new Date(),
    start = new Date(fromTime.getFullYear(), fromTime.getMonth(), fromTime.getDate());

  fromTime = new Date(start.getTime());
  var toTime = new Date(start.getTime() + spanTime - 1);
  timeView.onFiltersChanged({
    from:     fromTime,
    to:       toTime,
    span:     spanTime,
    spanName: spanName
  });
};

