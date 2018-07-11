/* main.js  */

// require ./commentary.js
// require ./model.js
// require ./util.js
// require ./screenfilevc.js
// require ./linkboxvc.js
// require ./statpanelvc.js
// require ./exporter.js
// require ./appvc.js

// --- mediator --------------------------------
var mediator = {
  _currentState: {},
  _eventList: {},
  _modeList: {
    OPEN_MENU: { value: 90, modal: false, cancelMode: AppVC.closeMenu },
    OPEN_THUMBNAIL_MENU: {
      value: 80,
      modal: false,
      cancelMode: screenfileVC.closeThumbnailMenu
    },
    BUILDING_LINKBOX: { value: 50, modal: false, cancelMode: noOp },
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
      abort: false
    };
  },
  attach: function(eventType, callback) {
    this._eventList[eventType].handler = callback;
  },
  processEvent: function(ev, eventName, context) {
    debugLog('INFO', 'mediator processing: ' + eventName);
    this._currentState.abort = false; // "semiglobal" - set to true in handler when aborting
    debugLog(
      'INFO',
      '   _currentState.mode.value=' + this._currentState.mode.value
    );
    if (!context) {
      context = this;
    }
    if (
      this._eventList[eventName].initialMode.value >=
      this._currentState.mode.value
    ) {
      // _currentState.mode = _eventList[eventName].initialMode;
      // this._currentState.mode.cancelMode.call(this._currentState.context, ev);
      this._eventList[eventName].handler.call(context, ev);
      if (this._currentState.abort) {
        this._eventList[eventName].initialMode.cancelMode.call(context, ev);
        this._currentState.mode = this._modeList.DEFAULT;
        this._currentState.context = null;
      } else {
        this._currentState.mode = this._eventList[eventName].resultingMode;
        this._currentState.context = context;
      }
    }
    // any event, even if doesn't happen, can turn off a current mode unless we're in a modal dialog
    else if (!this._currentState.mode.modal) {
      this._currentState.mode.cancelMode.call(this._currentState.context, ev);
      this._currentState.mode = this._modeList.DEFAULT;
      this._currentState.context = null;
    }

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
  }
};

// --- end mediator -------------------------------------------

mediator.init();

AppVC.init();
screenfileVC.init();
statpanelVC.init();
linkboxVC.init();

// TODO - review if using modal event or mode
// function cancelDialog() {}

function noOp() {}

// final things
downloadLink.download = gProto.exportSettings.downloadFilename;

// TODO delete
// var gModeList = {
// OPEN_MENU: { value: 90, modal: false, cancelMode: closeMenu },
// OPEN_THUMBNAIL_MENU: {
//   value: 80,
//   modal: false,
//   cancelMode: closeThumbnailMenu
// },
// BUILDING_LINKBOX: { value: 50, modal: false, cancelMode: noOp },
// SELECTING_LINKBOX: { value: 60, modal: false, cancelMode: unselectLinkbox },
// OPEN_DIALOG_SETTINGS: { value: 100, modal: true, cancelMode: cancelDialog }
// LOAD_SCREENFILES: { value: 100, modal: true, cancelMode: noOp },
// DEFAULT: { value: 0, modal: false, cancelMode: noOp }
// };

// var gEventList = {
// FILES_LOAD: {
//   initialMode: gModeList.LOAD_SCREENFILES,
//   resultingMode: gModeList.DEFAULT,
//   handler: [handleFiles]
// },
// MENU_OPEN: {
//   initialMode: gModeList.OPEN_MENU,
//   resultingMode: gModeList.OPEN_MENU,
//   handler: [displayMenu]
// },
// MENU_CLOSE: {
//   initialMode: gModeList.OPEN_MENU,
//   resultingMode: gModeList.DEFAULT,
//   handler: [closeMenu]
// },
// THUMBNAIL_MENU_OPEN: {
//   initialMode: gModeList.OPEN_THUMBNAIL_MENU,
//   resultingMode: gModeList.OPEN_THUMBNAIL_MENU,
//   handler: [displayThumbnailMenu]
// },
// THUMBNAIL_MENU_CLOSE: {
//   initialMode: gModeList.OPEN_THUMBNAIL_MENU,
//   resultingMode: gModeList.DEFAULT,
//   handler: [closeThumbnailMenu]
// },
// LINKBOX_START: {
//   initialMode: gModeList.BUILDING_LINKBOX,
//   resultingMode: gModeList.BUILDING_LINKBOX,
//   handler: [startRectangle]
// },
// LINKBOX_COMPLETE: {
//   initialMode: gModeList.BUILDING_LINKBOX,
//   resultingMode: gModeList.DEFAULT,
//   handler: [endRectangle]
// },
// LINKBOX_SELECT: {
//   initialMode: gModeList.SELECTING_LINKBOX,
//   resultingMode: gModeList.SELECTING_LINKBOX,
//   handler: [selectLinkbox]
// },
// LINKBOX_UNSELECT: {
//   initialMode: gModeList.SELECTING_LINKBOX,
//   resultingMode: gModeList.DEFAULT,
//   handler: [unselectLinkbox]
// },
// LINKBOX_FORMLINK: {
//   initialMode: gModeList.SELECTING_LINKBOX,
//   resultingMode: gModeList.DEFAULT,
//   handler: [addTargetToLinkbox]
// },
// LINKBOX_DELETE: {
//   initialMode: gModeList.SELECTING_LINKBOX,
//   resultingMode: gModeList.DEFAULT,
//   handler: [deleteLinkbox]
// }
// DEFAULT_RESUME: {
//   initialMode: gModeList.DEFAULT,
//   resultingMode: gModeList.DEFAULT,
//   handler: [noOp]
//}
// };

// var gCurrentState = { mode: gModeList.DEFAULT, context: null, abort: false };

// function processEvent(ev, eventName) {
//   console.log('processing: ' + eventName);
//   gCurrentState.abort = false; // "semiglobal" - set to true in handler when aborting
//   console.log('   gCurrentState.mode.value=' + gCurrentState.mode.value);
//   if (gEventList[eventName].initialMode.value >= gCurrentState.mode.value) {
//     // gCurrentState.mode = gEventList[eventName].initialMode;
//     gEventList[eventName].handler[0].call(this, ev);
//     if (gCurrentState.abort) {
//       gEventList[eventName].initialMode.cancelMode.call(this, ev);
//       gCurrentState.mode = gModeList.DEFAULT;
//       gCurrentState.context = null;
//     } else {
//       gCurrentState.mode = gEventList[eventName].resultingMode;
//       gCurrentState.context = this;
//     }
//   } else if (!gCurrentState.mode.modal) {
//     gCurrentState.mode.cancelMode.call(gCurrentState.context, ev);
//     gCurrentState.mode = gModeList.DEFAULT;
//     gCurrentState.context = null;
//     //ev.preventDefault(); // why??
//   }
//
//   ev.stopPropagation();
// }
