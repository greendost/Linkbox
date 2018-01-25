// main.js
// mockup tool
// 1/14/2018


// data to drive the view
// TODO module pattern singleton
var gProto = {
  'screenFiles':{},
  'links':{},
  'mappings': {
    'screen2links': {}
  },
  'settings':{
    output: {
      title: 'Prototype'
    },
    homeScreenFile:'',
    downloadFilename:'proto1.html',
    imgPath: ''   // relative path to image folder
  },
  getLinksForScreen: function(screenId) {
    var linkNames = this.mappings.screen2links[screenId];
    var selectedLinks = [];
    for(var i = 0; i < linkNames.length; i++) {
      selectedLinks.push(this.links[linkNames[i]]);
    }
    return selectedLinks;
  },
  getScreenFile: function(screenId) {
    return this.screenFiles[screenId];
  }
};


// var gScreenState = {
//   'activeScreenIndex': -1,
//   'isStartingRectangle': false,
//   'isSelectedRectangle': false;
// };


// var gActiveScreenIndex = -1;
var gActiveScreenId;

var divRectCandidate = {};
var gIsStartingRectangle = false;
var gIsSelectedRectangle = false;
var gSelectedLinks = {};  // array of trues, allowing for individual read/update, and all read/remove

// ------------ utility fns --------------------------
function makeIdname(str) {
  var m = str.split('.')[0];
  return m.replace()
}

function removeChildNodes(node) {
  while(node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

// modified version of solution at
// https://stackoverflow.com/questions/3968593/how-can-i-set-multiple-css-styles-in-javascript
// claim is that individual calls faster than updating via cssText
function setStyleOnDomObject( domObject, propertyObject )
{
 for (var property in propertyObject)
    domObject.style[property] = propertyObject[property];
}

function OkDialog(msg) {
  // background -> dialog box -> message and div-buttonWrapper with ok button
  var msgElem = document.createElement('p');
  msgElem.innerHTML = msg;
  var okButton = document.createElement('button');
  okButton.innerHTML = 'Ok';
  okButton.style.width='100%';
  okButton.style.fontSize='1.2rem';

  okButton.addEventListener('click', function() {
    document.getElementById('OkDialog').remove();
  })
  var buttonWrapper = document.createElement('div');
  buttonWrapper.style.textAlign = 'center';
  buttonWrapper.appendChild(okButton);
  var dialogBox = document.createElement('div');
  dialogBox.id = 'OkDialogBox';
  setStyleOnDomObject(dialogBox, {
    'position': 'absolute', 'backgroundColor': '#eee', 'color': '#333',
    'left': '50%', 'top': '50%', 'transform': 'translate(-50%, -50%)',
    'borderRadius':'4px', 'padding':'1rem'
  });

  dialogBox.appendChild(msgElem);
  dialogBox.appendChild(buttonWrapper);
  var backgroundOverlay = document.createElement('div');
  backgroundOverlay.id = 'OkDialog';
  setStyleOnDomObject(backgroundOverlay, {
    'backgroundColor': 'rgba(0,0,0,0.65)', 'height': '100%', 'width': '100%',
    'top': '0', 'left':'0', 'z-index':1, 'position': 'fixed'
  });

  backgroundOverlay.appendChild(dialogBox);
  document.getElementsByTagName('body')[0].appendChild(backgroundOverlay);
}

// --------------- core fns --------------------------
// setting up the big screen
function setupFileDisplayPanel() {
  var fileDisplayPanel = document.getElementById('FileDisplay');

  // set image
  var displayFile = document.getElementById('fileDisplayImage');
  displayFile.src = gProto.screenFiles[gActiveScreenId].fileMeta.src;  //this.src;
  displayFile.onmousedown = function(ev) {
    // prevent that dragging of img behavior
    ev.preventDefault();
  }

  // remove all links being displayed from prior screen
  var nodeList = document.querySelectorAll('#FileDisplay .srclinkbox');
  nodeList.forEach(function(x) {x.remove();});

  // add links of new screen
  var links = gProto.getLinksForScreen(gActiveScreenId);
  links.forEach(function(x) {
    // add div of link box to filedisplaypanel
    var bc = x.src;
    var linkDiv = makeLinkBox();
    linkDiv = updateDivWithBoxCoords.call(displayFile, linkDiv, bc);
    fileDisplayPanel.appendChild(linkDiv);
  })
}

function setupThumbnailsPanel() {
  var screenThumbnailsPanel = document.getElementById('ScreenThumbnailsPanel');
  // remove all nodes, and recreate all screen thumbnails
  removeChildNodes(screenThumbnailsPanel);

  Object.keys(gProto.screenFiles).forEach(function(x) {
    var screenFile = gProto.screenFiles[x];
    var imgDiv = document.createElement('div');
    var img = document.createElement("img");
    var imgDesc = document.createElement("p");
    imgDiv.classList.add('thumbnailDiv');
    img.classList.add('thumbnail');
    imgDesc.classList.add('thumbnailDesc');
    img.id = screenFile.fileMeta.idname + '-thumb';
    img.fmIdName = screenFile.fileMeta.idname;  // tie image back to gProto
    img.addEventListener('click', function(ev) {
      // console.log(this.fmIdName + " click");
      if(!gIsSelectedRectangle) {  // selecting thumbnail to set screen to work on
        gActiveScreenId = screenFile.fileMeta.idname;
        setupFileDisplayPanel();
      }
      else   // part of link construction - selecting thumbnail as the target
      {
        // update selected link(s) with target
        var targetScreenId = this.fmIdName;  // TODO - do I need this line?
        Object.keys(gSelectedLinks).forEach(function(x) {
            gProto.links[x].tgt.targetId = targetScreenId;
        });

        // now unselect links
        gSelectedLinks = {};
        // and re-render
        var linkBoxesDom = document.getElementsByClassName('srclinkbox-selected');
        for(var i = 0; i < linkBoxesDom.length; i++) {
          linkBoxesDom[i].classList.remove('srclinkbox-selected');
        }
        gIsSelectedRectangle = false;
      }
    });

    img.addEventListener('dblclick', function() {
      // console.log(this.fmIdName + " dblclick");
      // remove old home
      if(gProto.settings.homeScreenFile) {
        document.getElementById(gProto.settings.homeScreenFile + "-homeIcon").remove();
      }
      // setup new home
      gProto.settings.homeScreenFile = this.fmIdName;
      var svgHomeDiv = document.getElementsByClassName('homeIcon')[0].cloneNode(true);
      svgHomeDiv.id = this.fmIdName + "-homeIcon";
      this.parentNode.appendChild(svgHomeDiv);
    })

    imgDesc.innerHTML = screenFile.fileMeta.name;
    imgDiv.style.position = 'relative';
    imgDiv.appendChild(img);

    // append thumbnail link boxes to imgDiv too
    img.onload = function() {
      // set image attributes, which we should have here.
      screenFile.fileMeta.naturalWidth = this.naturalWidth;
      screenFile.fileMeta.naturalHeight = this.naturalHeight;
      var id = screenFile.fileMeta.idname;
      var imgPixelRatio = (id[id.length-1]==='x')&&(!isNaN(id[id.length-2])) ? parseInt(id[id.length-2],10): 1
      screenFile.fileMeta.imgPixelRatio = imgPixelRatio;
      // console.log('file loaded - ' + screenFile.fileMeta.name + " nw="
        // + screenFile.fileMeta.naturalWidth + " nh=" + screenFile.fileMeta.naturalHeight);

      // load mini link boxes for links mapped to the screen
      var links = gProto.getLinksForScreen(screenFile.fileMeta.idname);
      links.forEach(function(y) {
        var bc = y.src;
        // does this refer to img here ??
        var tmDiv = updateDivWithBoxCoords.call(this, document.createElement('div'), bc);
        tmDiv.classList.add('srclinkbox-tm');
        imgDiv.appendChild(tmDiv);
      });
    }

    var thumbnailItem = document.createElement('div');
    thumbnailItem.classList.add('thumbnailItem');
    thumbnailItem.appendChild(imgDiv);
    thumbnailItem.appendChild(imgDesc);

    screenThumbnailsPanel.appendChild(thumbnailItem);
    var fr = new FileReader();
    fr.onload = (function(imgX) {
      return function(e) {
        imgX.src = e.target.result;
        screenFile.fileMeta.src = e.target.result;
      };
    })(img)
    fr.readAsDataURL(screenFile.fileMeta);
  });
}

// essentially, start here.  Take user's selected files, and add them
// to our list of screenFiles in gProto.  Then generate the thumbnails
// from this list.
function handleFiles(fileList) {
  var files = Array.prototype.slice.call(fileList);

  files.forEach(function(x) {
    // TODO does x exist? - if so, overwrite or warn or something
    var screenFileItem = {};
    screenFileItem.fileMeta = x;
    screenFileItem.fileMeta.idname = makeIdname(x.name);
    gProto.screenFiles[screenFileItem.fileMeta.idname] = screenFileItem;
    gProto.mappings.screen2links[screenFileItem.fileMeta.idname] = [];
  });

  setupThumbnailsPanel();
}



// ---- Link box functions ----------------------------------------

function computeBoxCoords(origX, origY, currentX, currentY) {
  var rect = this.getBoundingClientRect();
  var lastX = currentX - rect.left;
  var lastY = currentY - rect.top;
  var h = Math.abs(lastY - origY);
  var w = Math.abs(lastX - origX);
  var startX = Math.min(lastX, origX);
  var startY = Math.min(lastY, origY);

  var xFactor = startX / rect.width;
  var yFactor = startY / rect.height;
  var widthFactor = w / rect.width;
  var heightFactor = h / rect.height;

  return {xFactor: xFactor, yFactor: yFactor,
    widthFactor: widthFactor, heightFactor: heightFactor,
    containerWidth: rect.width, containerHeight: rect.height,
    width: function() { return this.containerWidth*this.widthFactor},
    height: function() {return this.containerHeight*this.heightFactor}
    };
}


// currently for position absolute divs (where parent is position relative)
function updateDivWithBoxCoords(div, bc) {
  //- var scrollX = window.scrollX; var scrollY = window.scrollY;
  var scrollX = 0; var scrollY = 0;
  var rect = this.getBoundingClientRect();
  //- var positionAttr = window.getComputedStyle(this.parentNode).getPropertyValue('position')
  //- var top = positionAttr === 'absolute' ? 0 : rect.top;
  //- var left = positionAttr === 'absolute' ? 0 : rect.left;
  var top = 0; var left = 0;
  div.style.height = bc.heightFactor*rect.height + 'px';
  div.style.width = bc.widthFactor*rect.width + 'px';
  div.style.top = (scrollY + top + bc.yFactor*rect.height) + 'px';
  div.style.left = (scrollX + left + bc.xFactor*rect.width) + 'px';
  return div;
}

function makeLinkBox(newId) {
  var divRect = document.createElement('div');
  divRect.id = newId;
  divRect.classList.add('srclinkbox');
  divRect.addEventListener('click', function(ev) {
    console.log('div clicked ' + this.id);

    if(this.classList.contains('srclinkbox-selected')) {
      this.classList.remove('srclinkbox-selected');
    } else {
      this.classList.add('srclinkbox-selected');
    }

    if(gSelectedLinks[this.id])
      delete gSelectedLinks[this.id];
    else
      gSelectedLinks[this.id] = true;

    // ?? below line - use gSelectedLinks instead I think
    // gIsSelectedRectangle = document.getElementsByClassName('srclinkbox-selected').length > 0;
    // summing up trues
    gIsSelectedRectangle = Object.values(gSelectedLinks).reduce(function(t,cv) {return t+cv;},0);
    ev.stopPropagation();
  });
  divRect.onmousedown = function(ev) { ev.stopPropagation(); }
  divRect.onmouseup = function(ev) {
    if(gIsStartingRectangle) {
      gIsStartingRectangle = false;
      ev.stopPropagation();
    }
    // do i stop propagation otherwise ??
  }
  return divRect;
}


// create source linkbox (where user will click)
function startRectangle(ev) {
  console.log('startRectangle');
  gIsStartingRectangle = true;
  var rect = this.getBoundingClientRect();
  var nextIdNum = 1 + document.getElementsByClassName('srclinkbox').length;
  var nextId = gProto.getScreenFile(gActiveScreenId).fileMeta.idname + '-srclinkbox-' + nextIdNum;
  var divRect = makeLinkBox(nextId);
  divRect.id = gProto.screenFiles[gActiveScreenId].fileMeta.idname + '-srclinkbox-' + nextIdNum; // ?? pagedesc + ...

  divRectCandidate.startX = ev.clientX - rect.left;
  divRectCandidate.startY = ev.clientY - rect.top;
  divRectCandidate.divRect = divRect;
  //- document.getElementById('FileDisplay').appendChild(divRectCandidate.divRect);
};

// mouse move
// function updateRectangle(ev) {
// console.log('updateRectangle');
// if(!gIsStartingRectangle) return;
//   var bc = computeBoxCoords.call(this,divRectCandidate.startX, divRectCandidate.startY, ev.clientX, ev.clientY);
//   var divRect = divRectCandidate.divRect;
//   divRect = updateDivWithBoxCoords(divRect, bc, this.getBoundingClientRect());
// };

function endRectangle(ev) {
  console.log('endRectangle');
  if(!gIsStartingRectangle) return;
  var bc = computeBoxCoords.call(this,divRectCandidate.startX, divRectCandidate.startY, ev.clientX, ev.clientY);

  if( (bc.height() < 5) || (bc.width() < 5) ) {
    gIsStartingRectangle = false;
    return;  // ignore small boxes
  }

  var divRect = divRectCandidate.divRect;

  var link = {};
  link.src = {
    xFactor: bc.xFactor,
    yFactor: bc.yFactor,
    widthFactor: bc.widthFactor,
    heightFactor: bc.heightFactor,
    boxId: divRect.id,
    srcScreenId: gProto.screenFiles[gActiveScreenId].fileMeta.idname
  }
  link.meta = {
    isSelected: false  // not used, maybe remove as we track selected via css class on div linkbox
  }
  link.tgt = {
    targetId: ''
  }
  // gProto.links.push(link);
  // TODO gProto.addLink(id, link)
  gProto.links[link.src.boxId] = link;
  gProto.mappings.screen2links[gProto.screenFiles[gActiveScreenId].fileMeta.idname].push(link.src.boxId);
  // gSelectedLinks[link.src.boxId] = false;

  divRect.style.height = link.src.heightFactor*bc.containerHeight + 'px';
  divRect.style.width = link.src.widthFactor*bc.containerWidth + 'px';
  divRect.style.top = link.src.yFactor*bc.containerHeight + 'px';
  divRect.style.left = link.src.xFactor*bc.containerWidth + 'px';
  divRectCandidate.divRect = divRect;
  document.getElementById('FileDisplay').appendChild(divRectCandidate.divRect);

  // update thumbnail of screen tool
  var tm = document.getElementById(gProto.screenFiles[gActiveScreenId].fileMeta.idname+'-thumb');
  var tmDiv = updateDivWithBoxCoords.call(tm, document.createElement('div'), bc);
  tmDiv.classList.add('srclinkbox-tm');
  tm.parentNode.appendChild(tmDiv);
  gIsStartingRectangle = false;
};

var fileDisplayImage = document.getElementById('fileDisplayImage')
fileDisplayImage.addEventListener('mousedown', startRectangle);
fileDisplayImage.addEventListener('mouseup', endRectangle);


// ------- download link ------------------------------------
function buildLinkHandler(areaId, srcScreenId, targetScreenId) {
  var result = "document.getElementById('"+ areaId + "').addEventListener('click',";
  result += "function(ev) { ";
  result += "ev.preventDefault();" + "\n";
  result += "document.getElementById('" + srcScreenId + "').style.display = 'none';" + "\n";
  result += "document.getElementById('" + targetScreenId + "').style.display = 'block';" + "\n";
  result += "});";
  result += "\n";
  return result;
}

function buildOutputHTML() {
  var titleHTML = "<title>" + gProto.settings.output.title + "</title>" + "\n";
  var styleSection = "<style>" + "\n" +
    "* { padding: 0; margin: 0;}" + "\n" +
    "img { display: block; }" + "\n" +
    ".init-state {display: none;}" + "\n" +
    "</style>"+ "\n";
  var headSection = "<head>" +"\n" + titleHTML + styleSection + "</head>"+ "\n";

  var divSection = "";
  var scriptCode = "";

  // build screen to links map

  var screenFiles = Object.keys(gProto.screenFiles);
  for(i = 0; i < screenFiles.length; i++) {
    // var screenFileId = gProto.screenFiles[i].fileMeta.idname;
    var screenFileId = screenFiles[i];
    var screenFile = gProto.screenFiles[screenFileId];
    var mapName = screenFileId + "-map";

    var imgX = "<img";
    // <img srcset="dt-home.png, dt-home2x.png 2x" src="dt-home.png"
    // + 'dt-home.png, dt-home2x.png 2x'
    // TODO if retinaImage i.e. using multiple sets of images, based on adding 2x file
    var srcSetPath = screenFile.fileMeta.name;
    if((screenFileId[screenFileId.length-1]==='x') && (!isNaN(screenFileId[screenFileId.length-2]))) {
      var ratio = parseInt(screenFileId[screenFileId.length-2],10);
      var baseFile = srcSetPath.split('.')[0];  // assuming '<filename>2x.png' and one period
      var baseFile = baseFile.substr(0,baseFile.length-2) + "." + srcSetPath.split('.')[1];
      srcSetPath = baseFile + ", " + srcSetPath + " 2x"
    }
    imgX += " srcset='" + srcSetPath + "'";
    imgX += " src='" + screenFile.fileMeta.name + "'";
    imgX += " usemap='#"+ mapName +"'";
    imgX += "'/>";

    // find all links on current screen file
    var mapX = "<map name='"+ mapName +"'>";
    var linkNames = gProto.mappings.screen2links[screenFileId];
    for(var j= 0; j < linkNames.length; j++) {
      var linkName = linkNames[j];

      var link = gProto.links[linkName];
      var x1 = link.src.xFactor *
        (screenFile.fileMeta.naturalWidth / screenFile.fileMeta.imgPixelRatio);
      var y1 = link.src.yFactor *
        (screenFile.fileMeta.naturalHeight / screenFile.fileMeta.imgPixelRatio);
      var x2 = x1 + link.src.widthFactor *
        (screenFile.fileMeta.naturalWidth / screenFile.fileMeta.imgPixelRatio);
      var y2 = y1 + link.src.heightFactor *
        (screenFile.fileMeta.naturalHeight / screenFile.fileMeta.imgPixelRatio);
      mapX += "<area " + "id='"+ linkName +"'"
      mapX += " shape='rect'";
      mapX += " coords='" +  [x1,y1,x2,y2].join(',') + "'";
      mapX += " href='is-this-needed'" + ">";
      mapX += "\n";

      scriptCode += buildLinkHandler(linkName, link.src.srcScreenId, link.tgt.targetId);
    }
    mapX += "</map>" + "\n";

    var initState = screenFileId === gProto.settings.homeScreenFile ? "" : " class='init-state'";
    var divX = "<div id='" + screenFile.fileMeta.idname + "'" +
      initState + ">" + imgX + mapX+ "</div>" + "\n";
    divSection += divX;
  }  // end process screenfile iteration

  //- var divSection = "<h1>Downloaded</h1>"+ "\n";
  var scriptSection = "<" + "script" + "> "+ scriptCode +"</" + "script" + ">"+ "\n";
  var bodySection = "<body>" + "\n" + divSection + scriptSection + "</body>"+ "\n";
  var testHtmlString = "<!DOCTYPE html>" + "\n" + "<html>" + "\n" +
    headSection + bodySection + "</html>";

  var testData = 'data:' + "," + encodeURIComponent(testHtmlString);
  downloadLink.href = testData;
}

var downloadLink = document.getElementById('downloadLink');
downloadLink.addEventListener('click', function(ev) {
  // error checks
  console.log('download link - click');
  if(!gProto.settings.homeScreenFile) {
    OkDialog('Oops.  Please set the home screen (double-click thumbnail) and then try again.');
    ev.preventDefault();
    return;
  }

  if(!confirm('Proceed with download?')) {
    ev.preventDefault();
    return;
  }

  buildOutputHTML();
})

// downloadLink.href="#";
downloadLink.download = 'test1.html';
