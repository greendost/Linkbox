
// require ./commentary.js
// require ./model.js
// require ./util.js
// require ./screenfilevc.js
// require ./linkboxvc.js
// require ./statpanelvc.js
// require ./exporter.js
// require ./appvc.js

/* main.js  */
// --- mediator --------------------------------
var mediator = (function() {
  function noOp() {}

  var _processingQ = [];

  return {
  _currentState: {},
  _eventList: {},
  _modeList: {
    OPEN_MENU: { value: 90, modal: false, cancelMode: AppVC.closeMenu },
    OPEN_THUMBNAIL_MENU: {
      value: 80,
      modal: false,
      cancelMode: screenfileVC.closeThumbnailMenu
    },
    BUILDING_LINKBOX: { value: 50, modal: false, cancelMode: linkboxVC.killRectangle },
    SELECTING_LINKBOX: {
      value: 60,
      modal: false,
      cancelMode: linkboxVC.unselectLinkbox
    },
    // OPEN_DIALOG_SETTINGS: { value: 100, modal: true, cancelMode: cancelDialog },
    LOAD_SCREENFILES: { value: 100, modal: true, cancelMode: noOp },
    DEFAULT: { value: 0, modal: false, cancelMode: noOp }
  },
  init: function() {
    this._eventList = {
      FILES_LOAD: {
        initialMode: this._modeList.LOAD_SCREENFILES,
        resultingMode: this._modeList.DEFAULT
      },
      MENU_OPEN: {
        initialMode: this._modeList.OPEN_MENU,
        resultingMode: this._modeList.OPEN_MENU
      },
      MENU_CLOSE: {
        initialMode: this._modeList.OPEN_MENU,
        resultingMode: this._modeList.DEFAULT
      },
      MENU_ITEM_CLICK: {
        initialMode: this._modeList.OPEN_MENU,
        resultingMode: this._modeList.OPEN_MENU
      },
      THUMBNAIL_MENU_OPEN: {
        initialMode: this._modeList.OPEN_THUMBNAIL_MENU,
        resultingMode: this._modeList.OPEN_THUMBNAIL_MENU
      },
      THUMBNAIL_MENU_CLOSE: {
        initialMode: this._modeList.OPEN_THUMBNAIL_MENU,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_START: {
        initialMode: this._modeList.BUILDING_LINKBOX,
        resultingMode: this._modeList.BUILDING_LINKBOX
      },
      LINKBOX_COMPLETE: {
        initialMode: this._modeList.BUILDING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_FAILTOCOMPLETE: {
        initialMode: this._modeList.BUILDING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_SELECT: {
        initialMode: this._modeList.SELECTING_LINKBOX,
        resultingMode: this._modeList.SELECTING_LINKBOX
      },
      LINKBOX_UNSELECT: {
        initialMode: this._modeList.SELECTING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_FORMLINK: {
        initialMode: this._modeList.SELECTING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_DELETE: {
        initialMode: this._modeList.SELECTING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      SETUP_BIG_SCREEN: {
        initialMode: this._modeList.DEFAULT,
        resultingMode: this._modeList.DEFAULT
      },
      DEFAULT_RESUME: {
        initialMode: this._modeList.DEFAULT,
        resultingMode: this._modeList.DEFAULT
      }
    };

    this._currentState = {
      mode: this._modeList.DEFAULT,
      context: null,
      abort: false,
    };
  },
  attach: function(eventType, callback) {
    this._eventList[eventType].handler = callback;
  },
  processEvent: function(ev, eventName, context) {
    debugLog('INFO', 'mediator processing: ' + eventName);

    if(_processingQ.length) {
      _processingQ[_processingQ.length-1].passThrough = true;
    }
    _processingQ.push({eventName: eventName, passThrough: false});

    this._currentState.abort = false; // "semiglobal" - set to true in handler when aborting
    this._currentState.runningEvent = true; // "semiglobal" - set to true in handler when aborting

    debugLog(
      'INFO',
      '\t_currentState.mode.value=' + this._currentState.mode.value
    );
    if (!context) {
      context = this;
    }

    if (
      this._eventList[eventName].initialMode.value >=
      this._currentState.mode.value
    ) {
      // _currentState.mode = _eventList[eventName].initialMode;
      // e.g. big menu triggers cancel of thumbnail menu or selected linkbox
      // later on, might consider a stack of currentState.
      if(this._eventList[eventName].initialMode.value > this._currentState.mode.value) {
        this._currentState.mode.cancelMode.call(this._currentState.context, ev);
      }

      // make the call
      this._eventList[eventName].handler.call(context, ev);

      // ok, let's handle whether action went through, or was aborted
      if (this._currentState.abort) {
        this._eventList[eventName].initialMode.cancelMode.call(context, ev);
        this._currentState.mode = this._modeList.DEFAULT;
        this._currentState.context = null;
      } else {
        // if event is not marked pass through, then update mode and context
        if(!_processingQ[_processingQ.length-1].passThrough) {
          this._currentState.mode = this._eventList[eventName].resultingMode;
          this._currentState.context = context;
        }
      }
    }
    // any event, even if it doesn't go through, can still turn off a current mode 
    // unless we're in a modal dialog
    else if (!this._currentState.mode.modal) {
      // another approach - instead of cancelMode function, there could be 
      // cancelMode event, which would allow mode and context to be updated normally
      this._currentState.mode.cancelMode.call(this._currentState.context, ev);
      this._currentState.mode = this._modeList.DEFAULT;
      this._currentState.context = null;
    }

    _processingQ.pop();
    ev.stopPropagation();
  },
  abort: function() {
    this._currentState.abort = true;
  },
  getCurrentMode: function() {
    return this._currentState.mode;
  },
  getCurrentContext: function() {
    return this._currentState.context;
  },
  getMode: function(modeStr) {
    // no checks
    return this._modeList[modeStr];
  },
  noOp: noOp
  }
})();

// --- end mediator -------------------------------------------

mediator.init();

AppVC.init();
screenfileVC.init();
statpanelVC.init();
linkboxVC.init();

// final things
downloadLink.download = gProto.exportSettings.downloadFilename;

