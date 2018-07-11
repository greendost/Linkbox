// ------- exporter  ------------------------------------
function buildLinkHandler(areaId, srcScreenId, targetScreenId) {
  var result = `document.getElementById('${areaId}')
      .addEventListener('click',function(ev) {
        ev.preventDefault();
        document.getElementById('${srcScreenId}').style.display='none';
        document.getElementById('${targetScreenId}').style.display='block';
        history.pushState({url: '${targetScreenId}'},'','');
        gCurrentScreen = '${targetScreenId}';
      });`;

  // var result =
  //   "document.getElementById('" + areaId + "').addEventListener('click',";
  // result += 'function(ev) { ';
  // result += 'ev.preventDefault();' + '\n';
  // result +=
  //   "document.getElementById('" +
  //   srcScreenId +
  //   "').style.display = 'none';" +
  //   '\n';
  // result +=
  //   "document.getElementById('" +
  //   targetScreenId +
  //   "').style.display = 'block';" +
  //   '\n';
  // result += '});';
  // result += '\n';
  return result;
}

function buildOutputHTML() {
  var titleHTML =
    '<title>' + gProto.exportSettings.downloadTitle + '</title>' + '\n';
  var styleSection =
    '<style>' +
    '\n' +
    '* { padding: 0; margin: 0;}' +
    '\n' +
    'img { display: block; }' +
    '\n' +
    '.init-state {display: none;}' +
    '\n' +
    '</style>' +
    '\n';
  var headSection =
    '<head>' + '\n' + titleHTML + styleSection + '</head>' + '\n';

  var divSection = '';
  var scriptCode = '';
  var preScript = `var gCurrentScreen = '${
    gProto.exportSettings.homeScreenFile
  }';`;
  scriptCode += preScript;

  var screenFiles = Object.keys(gProto.screenFiles);
  for (var i = 0; i < screenFiles.length; i++) {
    var screenFileId = screenFiles[i];
    var screenFile = gProto.screenFiles[screenFileId];
    var mapName = screenFileId + '-map';

    var imgX = '<img';
    // <img srcset="dt-home.png, dt-home2x.png 2x" src="dt-home.png"
    // + 'dt-home.png, dt-home2x.png 2x'
    // if retinaImage i.e. using multiple sets of images, based on adding 2x file
    var srcSetPath = screenFile.fileMeta.name;
    if (
      screenFileId[screenFileId.length - 1] === 'x' &&
      !isNaN(screenFileId[screenFileId.length - 2])
    ) {
      var ratio = parseInt(screenFileId[screenFileId.length - 2], 10);
      var baseFile = srcSetPath.split('.')[0]; // assuming '<filename>2x.png' and one period
      var baseFile =
        baseFile.substr(0, baseFile.length - 2) +
        '.' +
        srcSetPath.split('.')[1];
      srcSetPath = baseFile + ', ' + srcSetPath + ' 2x';
    }
    imgX += " srcset='" + srcSetPath + "'";
    imgX += " src='" + screenFile.fileMeta.name + "'";
    imgX += " usemap='#" + mapName + "'";
    imgX += "'/>";

    // find all links on current screen file
    var mapX = "<map name='" + mapName + "'>";
    var linkNames = gProto.mappings.screen2links[screenFileId];
    for (var j = 0; j < linkNames.length; j++) {
      var linkName = linkNames[j];

      var link = gProto.links[linkName];
      var x1 =
        link.src.xFactor *
        (screenFile.fileMeta.naturalWidth / screenFile.fileMeta.imgPixelRatio);
      var y1 =
        link.src.yFactor *
        (screenFile.fileMeta.naturalHeight / screenFile.fileMeta.imgPixelRatio);
      var x2 =
        x1 +
        link.src.widthFactor *
          (screenFile.fileMeta.naturalWidth /
            screenFile.fileMeta.imgPixelRatio);
      var y2 =
        y1 +
        link.src.heightFactor *
          (screenFile.fileMeta.naturalHeight /
            screenFile.fileMeta.imgPixelRatio);
      mapX += '<area ' + "id='" + linkName + "'";
      mapX += " shape='rect'";
      mapX += " coords='" + [x1, y1, x2, y2].join(',') + "'";
      mapX += " href='is-this-needed'" + '>';
      mapX += '\n';

      scriptCode += buildLinkHandler(
        linkName,
        link.src.srcScreenId,
        link.tgt.targetId
      );
    }
    mapX += '</map>' + '\n';

    var initState =
      screenFileId === gProto.exportSettings.homeScreenFile
        ? ''
        : " class='init-state'";
    var divX =
      "<div id='" +
      screenFile.fileMeta.idname +
      "'" +
      initState +
      '>' +
      imgX +
      mapX +
      '</div>' +
      '\n';
    divSection += divX;
  } // end process screenfile iteration

  // additional code
  var postCode = `
    // initialize
    history.replaceState({url: '${
      gProto.exportSettings.homeScreenFile
    }'},'','');

    window.addEventListener('popstate', function(ev) {
      console.log('popstate called');
      var srcDivPage = ev.state.url;
      document.getElementById(srcDivPage).style.display = 'block';
      document.getElementById(gCurrentScreen).style.display = 'none';
      gCurrentScreen = srcDivPage;
    });
  `;
  scriptCode += postCode;

  //- var divSection = "<h1>Downloaded</h1>"+ "\n";
  var scriptSection =
    '<' + 'script' + '> ' + scriptCode + '</' + 'script' + '>' + '\n';
  var bodySection =
    '<body>' + '\n' + divSection + scriptSection + '</body>' + '\n';
  var testHtmlString =
    '<!DOCTYPE html>' +
    '\n' +
    '<html>' +
    '\n' +
    headSection +
    bodySection +
    '</html>';

  var testData = 'data:' + ',' + encodeURIComponent(testHtmlString);
  // downloadLink.href = testData;
  return testData;
}
