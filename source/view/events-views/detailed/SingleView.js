/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-detail-full',
  container: '.modal-content',
  itemViewContainer: '#modal-left-content',
  addAttachmentContainer: '#add-attachment',
  waitSubmit: false,
  addAttachmentId: 0,
  ui: {
    li: 'li.editable',
    edit: '.edit',
    submit: '#submit-edit',
    trash: '#trash-edit'
  },
  templateHelpers: function () {
    return {
      showContent: function () {
        return this.objectToHtml('content', this.model.get('event').content, 'content');
      }.bind(this),
      showAttachment: function () {
        return this.showAttachment();
      }.bind(this),
      getStreamStructure: function () {
        return this.getStreamStructure();
      }.bind(this)
    };
  },
  initialize: function () {
    if ($('.modal-panel-left').length === 0) {
      /*jshint -W101 */
      $(this.container).append('<div class="modal-panel-left"><div id="modal-left-content"></div></div>');
    }
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.addAttachment();
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
    this.ui.edit.bind('keypress', this.onEditKeypress.bind(this));
    this.ui.submit.bind('click', this.submit.bind(this));
    this.ui.trash.bind('click', this.trash.bind(this));
  },
  onEditClick: function (e) {
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
    if (e.relatedTarget.id === 'submit-edit') {
      this.submit();
    }
    return true;
  },
  onEditKeypress: function (e) {
    var ENTER_KEY = 13;
    if (e.which === ENTER_KEY) {
      this.updateEvent(e.currentTarget);
    }
  },
  addAttachment: function () {
    var id = 'attachment-' + this.addAttachmentId;
    var html = '<li><input type="file" id="' + id + '"></li>';
    this.addAttachmentId++;
    $(this.addAttachmentContainer).append(html);

    $('#' + id).bind('change', this._onFileAttach.bind(this));
  },
  _onFileAttach : function (event)	{
    var file = new FormData();
    event.target.disabled = true;
    file.append('attachment-0', event.target.files[0]);
    //this.model.addAttachment(file);
    this.addAttachment();
  },
  showAttachment: function () {
    var event =  this.model.get('event');
    var attachments = event.attachments;
    var html = '';
    if (attachments) {
      html += '<ul> attachments:';
      _.each(_.keys(attachments), function (k) {
        html += '<li>' + k + ': <a href="' + event.url + '/' + attachments[k].fileName +
          '?auth=' + event.connection.auth + '" target="_blank"> ' +
          attachments[k].fileName + '</a></li>';
      });
      html += '</ul>';
    } else {
      return '';
    }
    return html;
  },
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
    key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
    value = $($elem).val().trim();
    if (key === 'time') {
      value = new Date(value);
      if (isNaN(value)) {
        // TODO input is not a date decide what to do
        return;
      }
      value = value.getTime() / 1000;
    } else if (key === 'tags') {
      value = value.split(',');
      value = value.map(function (e) {
        return e.trim();
      });
    }
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();
    if (this.waitSubmit) {
      this.waitSubmit = false;
      this.submit();
    }
  },
  submit: _.throttle(function () {
      console.log('throttle submit');
      if ($('.editing').length !== 0) {
        this.waitSubmit = true;
        return;
      }
      var event = this.model.get('event');
      this.model.set('event', event).save();
    }, 5 * 1000),

  trash: function () {
    this.model.trash();
  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  },
  getStreamStructure: function () {
    var rootStreams = this.model.get('event').connection.datastore.getStreams(),
        currentStreamId = this.model.get('event').streamId,
        result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      result += this._walkStreamStructure(rootStreams[i], 0, currentStreamId);
    }
    return result;

  },
  _walkStreamStructure: function (stream, depth, currentStreamId) {
    var indentNbr = 4,
    result = '<option ';
    result += stream.id === currentStreamId ? 'selected="selected" ' : '';
    result += 'value="' + stream.id + '" >';
    for (var i = 0; i < depth * indentNbr; i++) {
      result += '&nbsp;';
    }
    result += stream.id;
    result += '</option>';
    for (var j = 0; j < stream.children.length; j++) {
      result += this._walkStreamStructure(stream.children[j], depth++, currentStreamId);
    }
    return result;
  },
  objectToHtml: function (key, object, id) {
    var result = '';
    if (_.isObject(object)) {
      result += '<ul>' + key + ':';
      _.each(_.keys(object), function (k) {
        result += this.objectToHtml(k, object[k], id + '-' + k);
      }.bind(this));
      result += '</ul>';
      return result;
    } else {
      return '<li class="editable" id="current-' + id + '">' + key + ': <label>' + object + '</label>' +
        '<input class="edit" id="edit-' + id + '" value="' + object + '"></li>';
    }
  }
});