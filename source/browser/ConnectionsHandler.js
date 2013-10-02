
var _ = require('underscore');
var Pryv = require('pryv');


//TODO write all add / remove connection logic

var ConnectionsHandler = module.exports = function (browser) {
  this.browser = browser;
  this._connections = {};
  this.serialCounter = 0;
};

/**
 * @param connection
 * @param andInitializeCallBack (optional) if function(error, connection) { } is defined,
 * the handler will try to initialize the connection
 * @returns {string} serialNumber to access this connection
 */
ConnectionsHandler.prototype.add = function (connection, andInitializeCallBack) {
  var serialId = 'N' + this.serialCounter++;
  this._connections[serialId] = connection;
  if (andInitializeCallBack) {
    connection.useLocalStorage(function (error/*, accessInfo*/) {
      // TODO correctly deal with this error
      if (error) { console.log(error); }
      andInitializeCallBack(error, connection);
    });
  }
  return serialId;
};

/**
 * get the connection form it's ID
 * @param connectionSerialID
 * @param andInitializeCallBack (optional) if function(error, connection) { } is defined,
 * the handler will try to initialize the connection
 * @returns {Pryv.Connection} the connection that matches this serial
 */
ConnectionsHandler.prototype.get = function (connectionSerialID, andInitializeCallBack) {
  var connection = this._connections[connectionSerialID];
  if (andInitializeCallBack) {
    if (! connection) {
      andInitializeCallBack('Cannot find connection with serialID: ' + connectionSerialID, null);
      return null;
    }
    connection.useLocalStorage(function (error/*, accessInfo*/) {
      // TODO correctly deal with this error
      if (error) { console.log(error); }
      andInitializeCallBack(error, connection);
    });
  }
  return connection;
};


