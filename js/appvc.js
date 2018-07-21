// --- App VC -------------------------------------------------

var AppVC = {
  init: function() {
    mediator.attach('FILES_LOAD', this.handleFiles);
    mediator.attach('MENU_OPEN', this.displayMenu);
    mediator.attach('MENU_CLOSE', this.closeMenu);
    mediator.attach('MENU_ITEM_CLICK', this.handleMenuItemClick);
    mediator.attach('SETUP_BIG_SCREEN', this.setupFileDisplayPanel);
    mediator.attach('DEFAULT_RESUME', noOp);

    // load screenfiles - menu option.  click to trigger input type=file element
    // to get file select dialog box
    document
      .getElementById('fileElemClickerLink')
      .addEventListener('click', function(ev) {
        mediator.processEvent(
          ev,
          'MENU_ITEM_CLICK',
          document.getElementsByClassName('barsButton')[0]
        );
        document.getElementById('fileElem').click();
      });

    document.getElementById('fileElem').addEventListener('click', function(ev) {
      // processEvent.call(this, ev, 'FILES_LOAD');
      ev.stopPropagation();
    });
    document
      .getElementById('fileElem')
      .addEventListener('change', function(ev) {
        // processEvent.call(this, ev, 'FILES_LOAD');
        mediator.processEvent(ev, 'FILES_LOAD', this);
      });

    document
      .getElementsByClassName('barsButton')[0]
      .addEventListener('click', function(ev) {
        if (
          mediator._currentState.mode.value ===
          mediator._modeList['OPEN_MENU'].value
        ) {
          mediator.processEvent(ev, 'MENU_CLOSE', this);
        } else {
          mediator.processEvent(ev, 'MENU_OPEN', this);
        }
      });

    // menu handlers
    document
      .getElementById('aboutDialogLink')
      .addEventListener('click', aboutDialogHandler);

    document
      .getElementById('settingsModalLink')
      .addEventListener('click', settingsDialogHandler);

    document
      .getElementById('downloadLink')
      .addEventListener('click', downloadFileHandler);

    // catch all so to speak.  Helps with the menu toggle off
    document
      .getElementsByTagName('body')[0]
      .addEventListener('click', function(ev) {
        debugLog('INFO_BODY', 'body clicked');
        mediator.processEvent(ev, 'DEFAULT_RESUME', this);
      });
    document
    .getElementsByTagName('body')[0]
    .addEventListener('mouseup', function(ev) {
      debugLog('INFO_BODY', 'mouse up over body');
      if(mediator.getCurrentMode() === mediator.getMode('BUILDING_LINKBOX')) {
        mediator.processEvent(ev, 'LINKBOX_FAILTOCOMPLETE', document.getElementById('FileDisplayPanel'));
      }
    });
  },
  handleFiles: function() {
    // var fileList = this.files;
    var fileList = Array.prototype.slice.call(this.files);

    screenfileVC.setupThumbnailsPanel(fileList);

    var waitingTitle = document.getElementById('waitingTitle');
    waitingTitle.style.display = 'none';
  },
  setupFileDisplayPanel: function() {
    // update model
    gProto.runningSettings.activeScreenId = this.fmIdName;

    // update views
    var fileDisplayPanel = document.getElementById('FileDisplayPanel');
    var displayFile = document.getElementById('fileDisplayImage');
    displayFile.src =
      gProto.screenFiles[gProto.runningSettings.activeScreenId].fileMeta.src; //this.src;
    displayFile.onmousedown = function(ev) {
      // prevent that dragging of img behavior
      ev.preventDefault();
    };

    // remove all links being displayed from prior screen
    var nodeList = document.querySelectorAll('#FileDisplayPanel .srclinkbox');
    nodeList.forEach(function(x) {
      x.remove();
    });

    // add links of new screen
    var links = gProto.getLinksForScreen(gProto.runningSettings.activeScreenId);
    links.forEach(function(x) {
      // add div of link box to filedisplaypanel
      var bc = x.src;
      var linkDiv = new Linkbox(bc.boxId).divRect;
      linkDiv = updateDivWithBoxCoords.call(displayFile, linkDiv, bc);
      fileDisplayPanel.appendChild(linkDiv);
    });

    // update stat StatPanel
    // document.getElementById('screenFilenameStat').innerHTML = this.fmIdName;
    document.getElementById('screenFilenameStat').innerHTML =
      gProto.runningSettings.activeScreenId;
  },

  // menu fns
  displayMenu: function(ev) {
    if (!this.classList.contains('menuEnabled')) {
      // is menu closed, then open it up
      this.classList.add('menuEnabled');
      document.querySelector('#mainMenu').classList.add('is-open');
    } else {
      // else it is open, so close it
      mediator.abort();
    }
  },
  closeMenu: function(ev) {
    this.classList.remove('menuEnabled');
    document.querySelector('#mainMenu').classList.remove('is-open');
  },
  handleMenuItemClick: function(ev) {
    mediator.processEvent(ev, 'MENU_CLOSE', this);
  }
};

// ok dialog function
function OkDialog(title, msgNode) {
  var okButton = document.querySelector('#okModal button');
  function closeDialog(ev) {
    backgroundOverlay.style.display = 'none';
    dialogBox.style.display = 'none';
    dialogBoxContent.getElementsByTagName('div')[0].remove();
    this.removeEventListener('click', closeDialog);
  }
  okButton.addEventListener('click', closeDialog);

  // now set content
  var dialogBox = document.getElementById('okModal');

  // set title
  dialogBox
    .getElementsByClassName('modal__title')[0]
    .getElementsByTagName('h1')[0].innerHTML = title;

  // now set content
  var dialogBoxContent = dialogBox.getElementsByClassName('modal__content')[0];
  dialogBoxContent.appendChild(msgNode);
  dialogBox.style.display = 'block';

  var backgroundOverlay = document.getElementsByClassName(
    'modal__background'
  )[0];

  backgroundOverlay.style.display = 'block';
}

// menu handlers
function settingsDialogHandler(ev) {
  var dialogOverlay = document.getElementsByClassName('modal__background')[0];
  dialogOverlay.style.display = 'block';
  var dialog = document.getElementById('settingsModal');
  dialog.style.display = 'block';

  document.getElementById('web-page-title').value =
    gProto.exportSettings.downloadTitle;
  document.getElementById('web-page-filename').value =
    gProto.exportSettings.downloadFilename;

  document
    .querySelector('#settingsModal .save')
    .addEventListener('click', function(ev) {
      dialog.style.display = 'none';
      dialogOverlay.style.display = 'none';
      gProto.exportSettings.downloadTitle = document.getElementById(
        'web-page-title'
      ).value;
      gProto.exportSettings.downloadFilename = document.getElementById(
        'web-page-filename'
      ).value;
      document.getElementById('downloadLink').download =
        gProto.exportSettings.downloadFilename;
    });
  document
    .querySelector('#settingsModal .cancel')
    .addEventListener('click', function(ev) {
      dialog.style.display = 'none';
      dialogOverlay.style.display = 'none';
    });
}

function aboutDialogHandler(ev) {
  var msgNode = document
    .getElementsByClassName('text-about')[0]
    .cloneNode(true);
  Array.prototype.slice
    .call(msgNode.getElementsByClassName('app-title'))
    .forEach(function(x) {
      x.innerHTML = gProto.internalSettings.appTitle;
    });
  msgNode.getElementsByClassName('app-versionnumber')[0].innerHTML =
    gProto.internalSettings.versionData.version;
  msgNode.getElementsByClassName('app-versiondate')[0].innerHTML =
    gProto.internalSettings.versionData.date;
  OkDialog('About', msgNode);
}

function downloadFileHandler(ev) {
  // error checks
  if (!gProto.exportSettings.homeScreenFile) {
    var msgNode = document.createElement('div');
    var paraNode = document.createElement('p');
    paraNode.innerHTML =
      'We need the home screen set; this option is available on the thumbnail menu';
    msgNode.appendChild(paraNode);
    OkDialog('Please review', msgNode);
    ev.preventDefault();
    return;
  }
  this.href = buildOutputHTML();
}
