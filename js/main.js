// main.js
// mockup tool
// 1/14/2018

var gProto = {
  'screenFiles':[],
  'links':[],
  'settings':{
    output: {
      title: 'Prototype'
    },
    homeScreenFile:'',
    downloadFile:'proto1.html'
  }  // imgPath
};

var gActiveScreenIndex = -1;

var divRectCandidate = {};
var gIsStartingRectangle = false;
var gIsSelectedRectangle = false;

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
  // dialogBox.style.position = 'absolute';
  // dialogBox.style.backgroundColor = '#eee';
  // dialogBox.style.color = '#333';
  // dialogBox.style.left = '50%';
  // dialogBox.style.top = '50%';
  // dialogBox.style.transform = 'translate(-50%, -50%)';
  dialogBox.appendChild(msgElem);
  dialogBox.appendChild(buttonWrapper);
  var backgroundOverlay = document.createElement('div');
  backgroundOverlay.id = 'OkDialog';
  setStyleOnDomObject(backgroundOverlay, {
    'backgroundColor': 'rgba(0,0,0,0.65)', 'height': '100%', 'width': '100%',
    'top': '0', 'left':'0', 'z-index':1, 'position': 'fixed'
  });
  // backgroundOverlay.style.backgroundColor = 'rgba(0,0,0,0.65)';
  // backgroundOverlay.style.height = '100%';
  // backgroundOverlay.style.width = '100%';
  // backgroundOverlay.style.top = '0';
  // backgroundOverlay.style.left = '0';
  // backgroundOverlay.style.zIndex = '1';
  // backgroundOverlay.style.position = 'fixed';
  backgroundOverlay.appendChild(dialogBox);
  document.getElementsByTagName('body')[0].appendChild(backgroundOverlay);
}

// --------------- core fns --------------------------
// setting up the big screen
function setupFileDisplayPanel() {
  var fileDisplayPanel = document.getElementById('FileDisplay');

  // set image
  var displayFile = document.getElementById('fileDisplayImage');
  displayFile.src = gProto.screenFiles[gActiveScreenIndex].fileMeta.src;  //this.src;
  displayFile.onmousedown = function(ev) {
    // prevent that dragging of img behavior
    ev.preventDefault();
  }

  // remove all links being displayed from prior screen
  var nodeList = document.querySelectorAll('#FileDisplay .source-box');
  // for(var i = 0; i < nodeList.length; i++) nodeList[i].remove();
  nodeList.forEach(function(x) {x.remove();});

  // add links of new screen
  for(i = 0; i < gProto.links.length; i++) {
    if(gProto.links[i].src.srcScreenId === gProto.screenFiles[gActiveScreenIndex].fileMeta.idname) {
      // add div of link box to filedisplaypanel
      var bc = gProto.links[i].src;
      var linkDiv = makeLinkBox();
      linkDiv = updateDivWithBoxCoords.call(displayFile, linkDiv, bc);
      linkDiv.id = gProto.links[i].src.boxId;
      fileDisplayPanel.appendChild(linkDiv);
    }
  }
}

function setupThumbnailsPanel() {
  var screenThumbnailsPanel = document.getElementById('ScreenThumbnailsPanel');
  // remove all nodes, and recreate all screen thumbnails
  removeChildNodes(screenThumbnailsPanel);
  gProto.screenFiles.forEach(function(x, index, arr) {
    var imgDiv = document.createElement('div');
    var img = document.createElement("img");
    var imgDesc = document.createElement("p");
    imgDiv.classList.add('thumbnailDiv');
    img.classList.add('thumbnail');
    imgDesc.classList.add('thumbnailDesc');
    img.fmIdName = x.fileMeta.idname;  // tie image back to gProto
    img.addEventListener('click', function(ev) {
      console.log(this.fmIdName + " click");
      if(!gIsSelectedRectangle) {  // selecting thumbnail to set screen to work on
        gActiveScreenIndex = index;
        setupFileDisplayPanel();
      }
      else   // part of link construction - selecting thumbnail as the target
      {
        // update selected link(s) with target
        var linkBoxesDom = document.getElementsByClassName('source-box-selected');
        linkBoxes = Array.prototype.slice.call(linkBoxesDom);
        var targetScreenId = this.fmIdName;
        linkBoxes.forEach(function(x) {
          for(var i = 0; i < gProto.links.length; i++) {
            if(gProto.links[i].src.boxId === x.id) break;
          }
          var link = gProto.links[i];
          link.tgt.targetId = targetScreenId;
          /*link*/
        });

        // now unselect items
        for(var i = 0; i < linkBoxesDom.length; i++) {
          linkBoxesDom[i].classList.remove('source-box-selected');
        }
        gIsSelectedRectangle = false;

      }
    });

    img.addEventListener('dblclick', function() {
      console.log(this.fmIdName + " dblclick");
      // remove old home
      if(gProto.settings.homeScreenFile) {
        document.getElementById(gProto.settings.homeScreenFile + "-homeIcon").remove();
      }
      // setup new home
      gProto.settings.homeScreenFile = this.fmIdName;
      var svgHomeDiv = document.getElementsByClassName('homeIcon')[0].cloneNode(true);
      svgHomeDiv.id = this.fmIdName + "-homeIcon";
      // svgHome.id = svgHome.id + "1";
      // svgHomeDiv.style.zIndex = '1000';
      // svgHomeDiv.style.width = '40%'; // '45px';
      // svgHomeDiv.style.width = '45px';
      // svgHomeDiv.style.height = '40%'; // '40px';
      // svgHomeDiv.style.height = '40px';
      // svgHomeDiv.style.position = 'absolute';
      // svgHomeDiv.style.top = '0px';
      // svgHomeDiv.style.left = '0px';
      // svgHomeDiv.style.border = '1px solid red';
      // svgHomeDiv.appendChild(svgHome)

      // svgHome.appendChild(document.getElementById('home').cloneNode(true));
      // svgHome.setAttribute('viewBox',"0 0 40 40");

      this.parentNode.appendChild(svgHomeDiv);
      // document.getElementById('Header').appendChild(svgHomeDiv);

    })

    imgDesc.innerHTML = x.fileMeta.name;
    imgDiv.style.position = 'relative';
    imgDiv.appendChild(img);

    // append thumbnail link boxes to imgDiv too
    img.onload = function() {
      // set image attributes, which we should have here.
      gProto.screenFiles[index].fileMeta.naturalWidth = this.naturalWidth;
      gProto.screenFiles[index].fileMeta.naturalHeight = this.naturalHeight;
      var id = gProto.screenFiles[index].fileMeta.idname;
      var imgPixelRatio = (id[id.length-1]==='x')&&(!isNaN(id[id.length-2])) ? parseInt(id[id.length-2],10): 1
      gProto.screenFiles[index].fileMeta.imgPixelRatio = imgPixelRatio;
      console.log('file loaded - ' + gProto.screenFiles[index].fileMeta.name + " nw="
        + gProto.screenFiles[index].fileMeta.naturalWidth + " nh=" + gProto.screenFiles[index].fileMeta.naturalHeight);

      for(var i = 0; i < gProto.links.length; i++) {
        if(gProto.links[i].src.srcScreenId === x.fileMeta.idname) {
          var bc = gProto.links[i].src;
          var tmDiv = updateDivWithBoxCoords.call(this, document.createElement('div'), bc);
          tmDiv.classList.add('source-box-tm');
          imgDiv.appendChild(tmDiv);
        }
      }
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
        gProto.screenFiles[index].fileMeta.src = e.target.result;
        // gProto.screenFiles[index].fileMeta.naturalWidth = imgX.naturalWidth;
        // gProto.screenFiles[index].fileMeta.naturalHeight = imgX.naturalHeight;
        // var id = gProto.screenFiles[index].fileMeta.idname;
        // var imgPixelRatio = (id[id.length-1]==='x')&&(!isNaN(id[id.length-2])) ? parseInt(id[id.length-2],10): 1
        // gProto.screenFiles[index].fileMeta.imgPixelRatio = imgPixelRatio;
      };
    })(img)
    fr.readAsDataURL(x.fileMeta);
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
    gProto.screenFiles.push(screenFileItem);
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
  //- return {startX: startX, startY: startY, width: w, height: h,
  return {xFactor: xFactor, yFactor: yFactor,
    widthFactor: widthFactor, heightFactor: heightFactor,
    containerWidth: rect.width, containerHeight: rect.height,
    width: function() { return this.containerWidth*this.widthFactor},
    height: function() {return this.containerHeight*this.heightFactor}
    };
}

// function updateDivWithBoxCoords(divNode, bc, rect) {
//   var scrollX = window.scrollX; var scrollY = window.scrollY;
//   divNode.style.height = bc.heightFactor*rect.height + 'px';
//   divNode.style.width = bc.widthFactor*rect.width + 'px';
//   divNode.style.top = (scrollY + rect.top + bc.yFactor*rect.height) + 'px';
//   divNode.style.left = (scrollX + rect.left + bc.xFactor*rect.width) + 'px';
//   return divNode;
// }

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

function makeLinkBox() {
  var divRect = document.createElement('div');
  divRect.classList.add('source-box');
  divRect.addEventListener('click', function(ev) {
    console.log('div clicked ' + this.id);

    if(this.classList.contains('source-box-selected')) {
      this.classList.remove('source-box-selected');
    } else {
      this.classList.add('source-box-selected');
    }
    gIsSelectedRectangle = document.getElementsByClassName('source-box-selected').length > 0;
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


// create source box (where user will click)
function startRectangle(ev) {
  console.log('startRectangle');
  gIsStartingRectangle = true;
  var rect = this.getBoundingClientRect();
  var nextIdNum = 1 + document.getElementsByClassName('source-box').length;

  var divRect = makeLinkBox();
  divRect.id = gProto.screenFiles[gActiveScreenIndex].fileMeta.idname + '-sourcebox-' + nextIdNum; // ?? pagedesc + ...

  divRectCandidate.startX = ev.clientX - rect.left;
  divRectCandidate.startY = ev.clientY - rect.top;
  divRectCandidate.divRect = divRect;
  //- document.getElementById('FileDisplay').appendChild(divRectCandidate.divRect);
};

// mouse move
//- function updateRectangle(ev) {
//- console.log('updateRectangle');
//- if(!gIsStartingRectangle) return;
//-   var bc = computeBoxCoords.call(this,divRectCandidate.startX, divRectCandidate.startY, ev.clientX, ev.clientY);
//-   var divRect = divRectCandidate.divRect;
//-   divRect = updateDivWithBoxCoords(divRect, bc, this.getBoundingClientRect());
//- };

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
    xFactor: bc.xFactor,  //boxCoords.startX / boxCoords.containerWidth,
    yFactor: bc.yFactor,  //boxCoords.startY / boxCoords.containerHeight,
    widthFactor: bc.widthFactor,  // boxCoords.width / boxCoords.containerWidth,
    heightFactor: bc.heightFactor,  //boxCoords.height / boxCoords.containerHeight,
    boxId: divRect.id,
    srcScreenId: gProto.screenFiles[gActiveScreenIndex].fileMeta.idname
  }
  link.meta = {
    isSelected: false  // not used, maybe remove as we track selected via css class on div linkbox
  }
  link.tgt = {
    targetId: ''
  }
  gProto.links.push(link);

  divRect.style.height = link.src.heightFactor*bc.containerHeight + 'px';
  divRect.style.width = link.src.widthFactor*bc.containerWidth + 'px';
  divRect.style.top = link.src.yFactor*bc.containerHeight + 'px';
  divRect.style.left = link.src.xFactor*bc.containerWidth + 'px';
  divRectCandidate.divRect = divRect;
  document.getElementById('FileDisplay').appendChild(divRectCandidate.divRect);

  // update thumbnail of screen tool
  var tmList = document.getElementsByClassName('thumbnail');
  var tmIndex = -1;
  for(var i = 0; i < tmList.length; i++) {
    if(tmList[i].fmIdName === gProto.screenFiles[gActiveScreenIndex].fileMeta.idname)  {
      tmIndex = i; break;
    }
  }
  var tmDiv = updateDivWithBoxCoords.call(tmList[tmIndex], document.createElement('div'), bc);
  tmDiv.classList.add('source-box-tm');
  tmList[i].parentNode.appendChild(tmDiv);
  gIsStartingRectangle = false;
};

//- var fileDisplayDiv = document.getElementById('FileDisplay');
var fileDisplayImage = document.getElementById('fileDisplayImage')
fileDisplayImage.addEventListener('mousedown', startRectangle);
fileDisplayImage.addEventListener('mouseup', endRectangle);
//- fileDisplayDiv.addEventListener('mousemove', updateRectangle);
document.getElementsByTagName('body')[0].addEventListener('mouseup',
  function(ev) {
    //- console.log('body mouseup')
});


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
  var screen2links = {};
  gProto.screenFiles.forEach(function(x) { screen2links[x.fileMeta.idname] = [];});
  for(var i = 0; i < gProto.links.length; i++) {
    screen2links[gProto.links[i].src.srcScreenId].push(gProto.links[i].src.boxId);
  }
  for(i = 0; i < gProto.screenFiles.length; i++) {
    var screenFileId = gProto.screenFiles[i].fileMeta.idname;
    var mapName = screenFileId + "-map";

    var imgX = "<img";
    // <img srcset="dt-home.png, dt-home2x.png 2x" src="dt-home.png"
    // + 'dt-home.png, dt-home2x.png 2x'
    // TODO if retinaImage i.e. using multiple sets of images, based on adding 2x file
    var srcSetPath = gProto.screenFiles[i].fileMeta.name;
    if((screenFileId[screenFileId.length-1]==='x') && (!isNaN(screenFileId[screenFileId.length-2]))) {
      var ratio = parseInt(screenFileId[screenFileId.length-2],10);
      var baseFile = srcSetPath.split('.')[0];  // assuming '<filename>2x.png' and one period
      var baseFile = baseFile.substr(0,baseFile.length-2) + "." + srcSetPath.split('.')[1];
      srcSetPath = baseFile + ", " + srcSetPath + " 2x"
    }
    imgX += " srcset='" + srcSetPath + "'";
    imgX += " src='" + gProto.screenFiles[i].fileMeta.name + "'";
    imgX += " usemap='#"+ mapName +"'";
    imgX += "'/>";

    // find all links on current screen file
    // var mapX = "<map name='"+ (gProto.screenFiles[i].fileMeta.idname+"-map") +"'>";
    var mapX = "<map name='"+ mapName +"'>";
    // for(var j= 0; j < screen2links[gProto.screenFiles[i].fileMeta.idname].length; j++) {
    for(var j= 0; j < screen2links[screenFileId].length; j++) {
      // var linkName = screen2links[gProto.screenFiles[i].fileMeta.idname][j];
      var linkName = screen2links[screenFileId][j];
      for(var k = 0; k < gProto.links.length; k++) {
        if(gProto.links[k].src.boxId === linkName) break;
      }
      var x1 = gProto.links[k].src.xFactor *
        (gProto.screenFiles[i].fileMeta.naturalWidth / gProto.screenFiles[i].fileMeta.imgPixelRatio);
      var y1 = gProto.links[k].src.yFactor *
        (gProto.screenFiles[i].fileMeta.naturalHeight / gProto.screenFiles[i].fileMeta.imgPixelRatio);
      var x2 = x1 + gProto.links[k].src.widthFactor *
        (gProto.screenFiles[i].fileMeta.naturalWidth / gProto.screenFiles[i].fileMeta.imgPixelRatio);
      var y2 = y1 + gProto.links[k].src.heightFactor *
        (gProto.screenFiles[i].fileMeta.naturalHeight / gProto.screenFiles[i].fileMeta.imgPixelRatio);
      mapX += "<area " + "id='"+ linkName +"'"
      mapX += " shape='rect'";
      mapX += " coords='" +  [x1,y1,x2,y2].join(',') + "'";
      mapX += " href='is-this-needed'" + ">";
      mapX += "\n";

      scriptCode += buildLinkHandler(linkName, gProto.links[k].src.srcScreenId, gProto.links[k].tgt.targetId);
    }
    mapX += "</map>" + "\n";

    var initState = screenFileId === gProto.settings.homeScreenFile ? "" : " class='init-state'";
    var divX = "<div id='" + gProto.screenFiles[i].fileMeta.idname + "'" +
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
    OkDialog('Oops.  Please set the home screen and then try again.');
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
