const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');
const { Script } = require('vm');
const CSSOM = require('CSSOM');
const expect = require('chai').expect;
const _ = require('lodash');
const util = require('util');

const childProcess = require('child_process');
var globalPkgDir = childProcess
  .execSync('npm root -g')
  .toString()
  .trim();
var instrumenter = require(globalPkgDir + '/' + 
  'nyc/node_modules/istanbul-lib-instrument').createInstrumenter({});

// notes
// adding files to input - https://github.com/jsdom/jsdom/issues/1272

// --- util ------------------------------------
function convToPixelsNum(measureStr) {
  var index;
  mStr = measureStr.trim();
  if ((index = mStr.indexOf('px')) !== -1) {
    return mStr.substr(0, index) * 1;
  }
  if ((index = mStr.indexOf('rem')) !== -1) {
    return mStr.substr(0, index) * 16;
  } else {
    return 0;
  }
}

function createFileList(window,fileList, imgDataList) {
  var rootDir = 'playground/mock-commonstore/';
  var fileExt = '.png';
  var resultList = [];
  fileList.map(function(fileX, index) {
    if(imgDataList) {
      var imgData =imgDataList[index];
    } else {
      var imgData =fs.readFileSync(rootDir+fileX+fileExt);
    }
    var file1 = new window.File([imgData], fileX+'.png', {
      type: 'image/png'
    });
    resultList.push(file1);
  });
  resultList.__proto__ = Object.create(window.FileList.prototype);
  return resultList;
}

const setTimeoutPromise = util.promisify(setTimeout);

// --- tests -----------------------------------
describe('testing linkbox methods', function() {
  var htmlFile, jsFile;
  var dom, document, window;

  var actionTimeout = 400;  // settimeout default to wait for a dom event
  var longActionTimeout = 1000;  // wait a little longer
  var maxTimePerTestCase = 500000;  // 5 sec max per test case, set higher when debugging
  
  var suiteData = {};

  this.timeout(maxTimePerTestCase);

  before(function() {
    // runs before all tests in this block
    // read files
    suiteData.jsdomOpts = {
      runScripts: 'outside-only',
      resources: 'usable',
      pretendToBeVisual: true
    };
    htmlFile = fs.readFileSync('build/index.html', 'utf8');    
    jsFile = fs.readFileSync('build/js/bundle.js', 'utf8');
    jsFile = instrumenter.instrumentSync(jsFile, 'build/js/bundle.js');

    // get some container size data from the stylesheet
    var css1 = fs.readFileSync('build/styles/style.css', 'utf8');
    var cssObj = CSSOM.parse(css1);
    var index = -1;
    for (var i = 0; i < cssObj.cssRules.length; i++) {
      if (cssObj.cssRules[i].selectorText === '.l-gridwrap') {
        index = i;
        break;
      }
    }
    var gridCols = cssObj.cssRules[4].style['grid-template-columns'];
    var gridRows = cssObj.cssRules[4].style['grid-template-rows'];
    suiteData.headerHeight = convToPixelsNum(gridRows.split(' ')[0]);
    suiteData.tmPanelHeight = convToPixelsNum(gridRows.split(' ')[1]);
    suiteData.statPanelWidth = convToPixelsNum(gridCols.split(' ')[0]);

    suiteData.defaultScreenLoaded = 'Det2';
    suiteData.defaultImgData =fs.readFileSync('playground/mock-commonstore/'+
      suiteData.defaultScreenLoaded+'.png');
    suiteData.defaultImgDataBase64 = 'data:image/png;base64,'+
      suiteData.defaultImgData.toString('base64');
  });


  beforeEach(function() {
    // runs before each test in this block
    // run base script
    // dom = JSON.parse(JSON.stringify(baseDom));  // does not work
    // dom = _.cloneDeep(baseDom);                 // does not work
    // dom = Object.create(baseDom);               // does not work
    dom = new JSDOM(htmlFile, suiteData.jsdomOpts);
    dom.runVMScript(new Script(jsFile)); 

    document = dom.window.document;
    window = dom.window;

    // setup default bounding client rect, as this does function doesn't appear to be 
    // properly defined in jsdom
    window.document.getElementById('fileDisplayImage').src = suiteData.defaultImgDataBase64;
    window.HTMLImageElement.prototype.getBoundingClientRect = function() {
      return {
        x: suiteData.statPanelWidth,
        y: suiteData.headerHeight + suiteData.tmPanelHeight,
        width: window.document.getElementById('fileDisplayImage').width,
        height: window.document.getElementById('fileDisplayImage').height,
        top: suiteData.headerHeight + suiteData.tmPanelHeight,
        right: 0, // ignore
        bottom: 0, // ignore
        left: suiteData.statPanelWidth
      };
    };
  });

  // after(function() {
  //   fs.writeFileSync('.nyc_output/out.json', JSON.stringify(window.__coverage__),'utf-8');
  // }); 

  it('test linkboxVC.startRectangle', function(done) {
    // test linkboxVC.startRectangle
    // pre:
    //  image loaded, model data setup, event parameter with coordinates
    //  optional: any prior linkboxes present
    // post:
    //  divRect added
    //
    var startX = 100,
      startY = 100;

    setTimeoutPromise(actionTimeout)
    .then(function() {
      var input = document.getElementById('fileElem');
      var list1 = createFileList(window,[suiteData.defaultScreenLoaded], [suiteData.defaultImgData]);
        Object.defineProperty(input, 'files', {
          value: list1,
          writeable: false
        });
      window.mediator.processEvent(document.createEvent('Event'), 'FILES_LOAD', input);

      return setTimeoutPromise(actionTimeout);
    })
    .then(function() { 
      document.getElementsByClassName('thumbnail__main')[0].click();
      return setTimeoutPromise(actionTimeout); 
    })
    .then(function() {
      var fileDisplayImage = document.getElementById('fileDisplayImage');
      var fileDisplayPanel = document.getElementById('FileDisplayPanel');
      var rect = fileDisplayImage.getBoundingClientRect();
      var ev = {clientX: rect.left + startX, clientY: rect.top + startY };
      // run the test
      window.linkboxVC.startRectangle.call(fileDisplayPanel, ev);
    
      try {
        expect(
          document.getElementsByClassName('srclinkbox').length
        ).to.equal(1);
        expect(window.linkboxVC.divRectCandidate.startX).to.equal(startX);
        expect(window.linkboxVC.divRectCandidate.startY).to.equal(startY);
        done();
      } catch(e) {
        done(e);
      }
     
    })
    .catch(function(err) {
      console.log(err);
      done(err);
    });
  });

  it('test update rectangle', function(done) {
    var startX = 100,
      startY = 100, moveX = 80; moveY = 20;
    
    setTimeoutPromise(actionTimeout)
    .then(function() {
      var input = document.getElementById('fileElem');
      var list1 = createFileList(window,['Det2']);
        Object.defineProperty(input, 'files', {
          value: list1,
          writeable: false
        });
      window.mediator.processEvent(document.createEvent('Event'), 'FILES_LOAD', input);

      return setTimeoutPromise(actionTimeout);
    })
    .then(function() {
      document.getElementsByClassName('thumbnail__main')[0].click();

      return setTimeoutPromise(actionTimeout);
    })
    .then(function() {
      var fileDisplayImage = document.getElementById('fileDisplayImage');
      var rect = fileDisplayImage.getBoundingClientRect();

      var ev = document.createEvent('Event');
      ev.clientX = rect.left + startX;
      ev.clientY = rect.top + startY;

      window.mediator.processEvent(ev,'LINKBOX_START', 
      document.getElementById('FileDisplayPanel'));
    
      var fileDisplayPanel = document.getElementById('FileDisplayPanel');
      var ev = {clientX: rect.left + startX+moveX, clientY: rect.top + startY+moveY };
      // run the test
      window.linkboxVC.updateRectangle.call(fileDisplayPanel, ev);
    
      try {
        expect(
          window.document.getElementsByClassName('srclinkbox').length
        ).to.equal(1);
        expect(window.linkboxVC.divRectCandidate.divRect.style.width).to.equal(moveX+'px');
        expect(window.linkboxVC.divRectCandidate.divRect.style.height).to.equal(moveY+'px');
        done();
      } catch(e) {
        done(e);
      }
    })
    .catch(function(err) {
      console.log(err);
      done(err);
    });
  });


  it('test end rectangle', function(done) {  
    var startX = 100, startY = 100, moveX = 80; moveY = 20;

    setTimeoutPromise(actionTimeout)
    .then(function() { 
      var input = document.getElementById('fileElem');
      var list1 = createFileList(window,[suiteData.defaultScreenLoaded], [suiteData.defaultImgData]);
        Object.defineProperty(input, 'files', {
          value: list1,
          writeable: false
        });
      window.mediator.processEvent(document.createEvent('Event'), 'FILES_LOAD', input);
      return setTimeoutPromise(actionTimeout);
    })
    .then(function() {
      document.getElementsByClassName('thumbnail__main')[0].click();
      return setTimeoutPromise(actionTimeout);
    })
    .then(function() {
      var fileDisplayImage = document.getElementById('fileDisplayImage');
      var rect = fileDisplayImage.getBoundingClientRect();

      var ev = document.createEvent('Event');
      ev.clientX = rect.left + startX;
      ev.clientY = rect.top + startY;

      window.mediator.processEvent(ev,'LINKBOX_START', 
        document.getElementById('FileDisplayPanel'));

      // setup param          
      var fileDisplayPanel = document.getElementById('FileDisplayPanel');
      var ev = {clientX: rect.left + startX+moveX, clientY: rect.top + startY+moveY };

      // run the test
      window.linkboxVC.endRectangle.call(fileDisplayPanel, ev);
      try {
        expect(
          document.getElementsByClassName('srclinkbox').length
        ).to.equal(1);
        expect(window.linkboxVC.divRectCandidate.divRect.style.width).to.equal(moveX+'px');
        expect(window.linkboxVC.divRectCandidate.divRect.style.height).to.equal(moveY+'px');
        expect(
          document.getElementsByClassName('srclinkbox--tm').length
        ).to.equal(1);
        expect(
          document.getElementById(suiteData.defaultScreenLoaded+'-thumb')
            .parentNode.getElementsByClassName('srclinkbox--tm').length
        ).to.equal(1);
        done();
      } catch(e) {
        done(e);
      }
    })
    .catch(function(err) {
      console.log(err);
      done(err);
    });
  });

  it('test select unselect', function(done) {  
    var startX = 100, startY = 100, moveX = 80; moveY = 20;

    (async function() {
      try {
        var input = document.getElementById('fileElem');
        var list1 = createFileList(window,[suiteData.defaultScreenLoaded], [suiteData.defaultImgData]);
        Object.defineProperty(input, 'files', {
          value: list1,
          writeable: false
        });
        window.mediator.processEvent(document.createEvent('Event'), 'FILES_LOAD', input);
        await setTimeoutPromise(actionTimeout);
        
        document.getElementsByClassName('thumbnail__main')[0].click();
        await setTimeoutPromise(actionTimeout);
        
        var fileDisplayImage = document.getElementById('fileDisplayImage');
        var fileDisplayPanel = document.getElementById('FileDisplayPanel');
        var rect = fileDisplayImage.getBoundingClientRect();

        var ev = document.createEvent('Event');
        ev.clientX = rect.left + startX;
        ev.clientY = rect.top + startY;

        window.mediator.processEvent(ev,'LINKBOX_START', 
          fileDisplayPanel);

        // finish up rectangle  
        ev.clientX = rect.left + startX+ moveX; ev.clientY= rect.top + startY+moveY;
        window.mediator.processEvent(ev,'LINKBOX_COMPLETE', 
          fileDisplayPanel);

        // first select
        var linkbox = document.getElementsByClassName('srclinkbox')[0];
        linkbox.click();
        await setTimeoutPromise(actionTimeout);

        // now unselect
        linkbox.click();
        await setTimeoutPromise(actionTimeout);
        expect(linkbox.classList.contains('srclinkbox--selected')).to.be.false;



        expect(
          document.getElementsByClassName('srclinkbox').length
        ).to.equal(1);
        expect(window.linkboxVC.divRectCandidate.divRect.style.width).to.equal(moveX+'px');
        expect(window.linkboxVC.divRectCandidate.divRect.style.height).to.equal(moveY+'px');
        expect(
          document.getElementsByClassName('srclinkbox--tm').length
        ).to.equal(1);
        expect(
          document.getElementById(suiteData.defaultScreenLoaded+'-thumb')
            .parentNode.getElementsByClassName('srclinkbox--tm').length
        ).to.equal(1);
        done();
      } catch(e) {
        done(e);
      }

    })();
  });

  it('test formlink', function(done) {  
    var startX = 100, startY = 100, moveX = 80; moveY = 20;

    (async function() {
      try {
        var input = document.getElementById('fileElem');
        var list1 = createFileList(window,['Home', 'Details']);
        Object.defineProperty(input, 'files', {
          value: list1,
          writeable: false
        });
        window.mediator.processEvent(document.createEvent('Event'), 'FILES_LOAD', input);
        await setTimeoutPromise(longActionTimeout);
        
        document.getElementById('Home-thumb').parentNode.click();
        await setTimeoutPromise(actionTimeout);
        
        var fileDisplayImage = document.getElementById('fileDisplayImage');
        var fileDisplayPanel = document.getElementById('FileDisplayPanel');
        var rect = fileDisplayImage.getBoundingClientRect();

        var ev = document.createEvent('Event');
        ev.clientX = rect.left + startX;
        ev.clientY = rect.top + startY;

        window.mediator.processEvent(ev,'LINKBOX_START', 
          fileDisplayPanel);

        // finish up rectangle  
        ev.clientX = rect.left + startX+ moveX; ev.clientY= rect.top + startY+moveY;
        window.mediator.processEvent(ev,'LINKBOX_COMPLETE', 
          fileDisplayPanel);

        // // first select
        var linkbox = document.getElementsByClassName('srclinkbox')[0];
        linkbox.click();
        await setTimeoutPromise(actionTimeout);

        document.getElementById('Details-thumb').parentNode.click();
        await setTimeoutPromise(actionTimeout);

        expect(
          document.getElementById('ScreenThumbnailsPanel').getElementsByClassName('thumbnail').length
        ).to.equal(2);
        expect(linkbox.classList.contains('srclinkbox--selected')).to.be.false;
        expect(window.gProto.links["Home-srclinkbox-1"].tgt.targetId).to.be.equal('Details');

       
        done();
      } catch(e) {
        done(e);
      }

    })();
  });

  it('test sethome', function(done) {  
    var startX = 100, startY = 100, moveX = 80; moveY = 20;

    (async function() {
      try {
        var input = document.getElementById('fileElem');
        var list1 = createFileList(window,['Home', 'Details']);
        Object.defineProperty(input, 'files', {
          value: list1,
          writeable: false
        });
        window.mediator.processEvent(document.createEvent('Event'), 'FILES_LOAD', input);
        await setTimeoutPromise(longActionTimeout);
        
        document.getElementById('Home-thumb').parentNode.click();
        await setTimeoutPromise(actionTimeout);
        
        var thumbnail = document.getElementById('Home-thumb').parentNode.parentNode;
        var tmSidePanel = thumbnail.getElementsByClassName('thumbnail__sidePanel')[0];
        var tmMainPanel = thumbnail.getElementsByClassName('thumbnail__main')[0];
        var cogButton = tmSidePanel.getElementsByClassName('cogButton')[0];
        cogButton.dispatchEvent(new window.Event('click'));
        await setTimeoutPromise(actionTimeout);

        var homeLink = tmSidePanel.getElementsByClassName('setAsHomeLink')[0];
        homeLink.click();
        await setTimeoutPromise(actionTimeout);


        expect(
          tmMainPanel.getElementsByClassName('icon--home').length
        ).to.equal(1);
        expect(window.gProto.runningSettings.activeScreenId).to.equal('Home');

       
        done();
      } catch(e) {
        done(e);
      }

    })();
  });

  it('test delete linkbox', function(done) {  
    var startX = 100, startY = 100, moveX = 80; moveY = 20;

    (async function() {
      try {
        var input = document.getElementById('fileElem');
        var list1 = createFileList(window,[suiteData.defaultScreenLoaded], [suiteData.defaultImgData]);
        Object.defineProperty(input, 'files', {
          value: list1,
          writeable: false
        });
        window.mediator.processEvent(document.createEvent('Event'), 'FILES_LOAD', input);
        await setTimeoutPromise(actionTimeout);
        
        document.getElementsByClassName('thumbnail__main')[0].click();
        await setTimeoutPromise(actionTimeout);
        
        var fileDisplayImage = document.getElementById('fileDisplayImage');
        var fileDisplayPanel = document.getElementById('FileDisplayPanel');
        var rect = fileDisplayImage.getBoundingClientRect();

        var ev = document.createEvent('Event');
        ev.clientX = rect.left + startX;
        ev.clientY = rect.top + startY;

        window.mediator.processEvent(ev,'LINKBOX_START', 
          fileDisplayPanel);

        // finish up rectangle  
        ev.clientX = rect.left + startX+ moveX; ev.clientY= rect.top + startY+moveY;
        window.mediator.processEvent(ev,'LINKBOX_COMPLETE', 
          fileDisplayPanel);

        // first select
        var linkbox = document.getElementsByClassName('srclinkbox')[0];
        linkbox.click();
        await setTimeoutPromise(actionTimeout);

        // now delete linkbox
        var linkId = window.gProto.runningSettings.selectedLinks[0];
        ev = document.createEvent('Event');
        window.linkboxVC.deleteLinkbox(ev);
        
        expect(
          document.getElementsByClassName('srclinkbox')
        ).to.have.lengthOf(0);
        expect(window.gProto.runningSettings.selectedLinks).to.be.an('object').that.is.empty;
        expect(window.gProto.links).to.be.an('object').that.is.empty;
        
        done();
      } catch(e) {
        done(e);
      }

    })();
  });

  // perhaps rerun dom script in before each
  it('test click in file display panel when nothing loaded', function(done) {
    dom = new JSDOM(htmlFile, suiteData.jsdomOpts);
    dom.runVMScript(new Script(jsFile)); 
    document = dom.window.document;
    window = dom.window;

    (async function() {
      try {
        var fileDisplayPanel = document.getElementById('FileDisplayPanel');
        var fileDisplayImage = document.getElementById('fileDisplayImage');

        expect(fileDisplayImage.src).to.equal('');
        // fileDisplayPanel.click(); 
        fileDisplayPanel.dispatchEvent(new window.Event('mousedown'))
        await setTimeoutPromise(actionTimeout);
        fileDisplayPanel.dispatchEvent(new window.Event('mouseup'))
        await setTimeoutPromise(actionTimeout);
        // well, not really expecting anything other than no errors
        expect(fileDisplayImage.src).to.equal('');
        done();
      } catch(e) {
        done(e);
      }
    })();

  });

});
