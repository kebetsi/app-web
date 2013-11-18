/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-fusion-graph',
  container: '#modal-left-content-single',

  initialize: function () {
    //console.log('SingleView initialize');
    this.listenTo(this.model, 'change', this.render);
  },

  onRender: function () {
    //console.log('SingleView onRender');
    var myModel = this.model.get('event');
    if (!myModel) {
      return;
    }

    var res = myModel.type.split('/');
    var plotContainer = 'fusion' + myModel.streamId + res[0] + res[1];
    var plotContainerDiv = '<div id="' + plotContainer +
      '" class="graphContainer"></div>';


    $(this.container).html(plotContainerDiv);

    //console.log($('#' + plotContainer));
    $('#' + plotContainer).css({
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    var data = myModel.elements;
    //console.log('onreder - data', data);
    var dataMapper = function (d) {
      return _.map(d, function (e) {
        return [e.time, e.content];
      });
    };


    var series = [];
    series.push({
      data: dataMapper(data),
      label: myModel.type,
      type: 0
    });

    var options = {
      grid: {
        hoverable: true,
        clickable: true,
        borderWidth: 0,
        minBorderMargin: 5
      },
      xaxes: [ { show: false } ],
      yaxes: []
    };

    //console.log('series', series);
    var plotData = [];
    for (var i = 0; i < series.length; ++i) {
      options.yaxes.push({ show: false});
      plotData.push({
        data: series[i].data,
        label: series[i].label,
        points: { show: true },
        lines: { show: true }
      });
    }
    this.plot = $.plot($('#' + plotContainer), plotData, options);
  }
});