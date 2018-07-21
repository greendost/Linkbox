// ------- screenfilevc.js -------------------------------------

var screenfileVC = {
  init: function() {
    mediator.attach('THUMBNAIL_MENU_OPEN', this.displayThumbnailMenu);
    mediator.attach('THUMBNAIL_MENU_CLOSE', this.closeThumbnailMenu);
  },
  // view load
  setupThumbnailsPanel: function(fileList) {
    fileList.forEach(function(x) {
      // has screen been loaded? - if so, options include overwrite or warn or something
      var screenFileItem = {};
      screenFileItem.fileMeta = x;
      screenFileItem.fileMeta.idname = makeIdname(x.name);
      gProto.screenFiles[screenFileItem.fileMeta.idname] = screenFileItem;
      gProto.mappings.screen2links[screenFileItem.fileMeta.idname] = [];
    });

    var screenThumbnailsPanel = document.getElementById(
      'ScreenThumbnailsPanel'
    );
    // remove all nodes, and recreate all screen thumbnails
    removeChildNodes(screenThumbnailsPanel);

    var thumbnailTemplate = document.getElementsByClassName('thumbnail')[0];
    Object.keys(gProto.screenFiles).forEach(function(x) {
      var screenFile = gProto.screenFiles[x];

      var thumbnail = thumbnailTemplate.cloneNode(true);
      var imgDiv = findDomNodeByClass(thumbnail, 'thumbnail__main');
      var img = imgDiv.getElementsByTagName('img')[0];
      var tbw = findDomNodeByClass(thumbnail, 'thumbnail__bottomWrap');
      var imgDesc = findDomNodeByClass(tbw, 'thumbnailDesc');
      var tsp = findDomNodeByClass(thumbnail, 'thumbnail__sidePanel');
      var cog = findDomNodeByClass(tsp, 'cogButton');

      // thumbnail menu
      cog.addEventListener('click', function(ev) {
        mediator.processEvent(ev, 'THUMBNAIL_MENU_OPEN', this);
      });

      img.id = screenFile.fileMeta.idname + '-thumb';
      img.fmIdName = screenFile.fileMeta.idname; // tie image back to gProto

      imgDiv.addEventListener('click', function(ev) {
        debugLog('INFO', 'img.fmIdName=' + img.fmIdName);
        if (
          mediator.getCurrentMode() !== mediator.getMode('SELECTING_LINKBOX')
        ) {
          // selecting thumbnail to set screen to work on
          mediator.processEvent(ev, 'SETUP_BIG_SCREEN', img);
        } else {
          // part of link construction - selecting thumbnail as the target
          mediator.processEvent(ev, 'LINKBOX_FORMLINK', img);
        }
      });

      // img.addEventListener('dblclick', function() {
      //   setHome(this.parentNode.parentNode);
      // });

      imgDesc.innerHTML = screenFile.fileMeta.name;

      // append thumbnail link boxes to imgDiv too
      img.onload = function() {
        // set image attributes, which we should have here.
        screenFile.fileMeta.naturalWidth = this.naturalWidth;
        screenFile.fileMeta.naturalHeight = this.naturalHeight;
        var id = screenFile.fileMeta.idname;
        var imgPixelRatio =
          id[id.length - 1] === 'x' && !isNaN(id[id.length - 2])
            ? parseInt(id[id.length - 2], 10)
            : 1;
        screenFile.fileMeta.imgPixelRatio = imgPixelRatio;

        // load mini link boxes for links mapped to the screen
        var links = gProto.getLinksForScreen(screenFile.fileMeta.idname);
        links.forEach(function(y) {
          var bc = y.src;
          // does this refer to img here ??
          var tmDiv = updateDivWithBoxCoords.call(
            this,
            document.createElement('div'),
            bc
          );
          tmDiv.classList.add('srclinkbox--tm');
          imgDiv.appendChild(tmDiv);
        });
      };

      screenThumbnailsPanel.appendChild(thumbnail);

      // read in file
      var fr = new FileReader();
      fr.onload = (function(imgX) {
        return function(e) {
          console.log('file reader - loading files');
          imgX.src = e.target.result;
          screenFile.fileMeta.src = e.target.result;
        };
      })(img);
      console.log('before file reader');

      fr.readAsDataURL(screenFile.fileMeta);
    });
  },
  displayThumbnailMenu: function(ev) {
    var presentDialog = false;

    if (this.parentNode.getElementsByClassName('menu--thumbnailMenu').length) {
      mediator.abort();
      return;
    } else {
      var dialog = document
        .getElementsByClassName('menu--thumbnailMenu')[0]
        .cloneNode(true);
      var thumbnailSidePanel = this.parentNode;
      var thumbnail = thumbnailSidePanel.parentNode;
      thumbnailSidePanel.appendChild(dialog);

      var homeLink = dialog.getElementsByClassName('setAsHomeLink')[0];
      homeLink.addEventListener('click', function(ev) {
        screenfileVC.setHome(thumbnail); // set to the thumbnail item div container
      });
      var deleteLink = findDomNodeByClass(dialog, 'deleteScreenFileLink');
      deleteLink.addEventListener('click', function(ev) {
        var thumbnailMain = findDomNodeByClass(thumbnail, 'thumbnail__main');
        var img = thumbnailMain.getElementsByTagName('img')[0];

        gProto.removeScreenFile(img.fmIdName);

        // if screen file we are deleting is active, update view
        if (gProto.runningSettings.activeScreenId === img.fmIdName) {
          // for now, manually remove nodes.  better approach may be to re-render
          // from model
          var fileDisplayPanel = document.getElementById('FileDisplayPanel');
          var fileDisplayImage = document.getElementById('fileDisplayImage');
          fileDisplayImage.src = '';
          [].slice
            .call(fileDisplayPanel.getElementsByClassName('srclinkbox'))
            .forEach(function(x) {
              x.remove();
            });

          document.getElementById('screenFilenameStat').innerHTML = '';
        }

        thumbnail.remove();
      });
    }
  },
  closeThumbnailMenu: function(ev) {
    // per s.o., event listeners should get removed too.
    this.parentNode.getElementsByClassName('menu--thumbnailMenu')[0].remove();
  },
  setHome: function(thumbnailNode) {
    // remove old home
    if (gProto.exportSettings.homeScreenFile) {
      document
        .getElementById(gProto.exportSettings.homeScreenFile + '-homeIcon')
        .remove();
    }
    // setup new home
    var thumbnailMain = thumbnailNode.getElementsByClassName(
      'thumbnail__main'
    )[0];
    var img = thumbnailMain.getElementsByTagName('img')[0];
    gProto.exportSettings.homeScreenFile = img.fmIdName;

    var svgHomeNode = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    var svgUseNode = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'use'
    );
    var origHomeSymbol = document.getElementById('svg-icon-home');

    svgUseNode.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      '#svg-icon-home'
    );
    svgHomeNode.setAttribute('viewBox', origHomeSymbol.getAttribute('viewBox'));
    svgHomeNode.className.baseVal = 'icon icon--home';
    svgHomeNode.id = img.fmIdName + '-homeIcon';
    svgHomeNode.appendChild(svgUseNode);
    thumbnailMain.appendChild(svgHomeNode);
  }
};
