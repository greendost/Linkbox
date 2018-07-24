# Linkbox
Simple prototyping tool where you select screen mockup images, add linkboxes, select target screens for those linkboxes, select one screen as the home or starting point, and finally export an html file that along with your mockup images will represent the prototype.

## Getting Started
These instructions will allow you to setup and build the project on your local machine for development and testing purposes. 

### Prerequisites
Node, NPM for development; Sass for styles; Mocha, Chai, NYC (Istanbul) for testing, installed globally. Other, local, packages should be in package.json

You should also have on hand a set of screen mockups (images) for the app you are looking to prototype.


### Installing
Clone repository
Run npm install
Run Gulp in a dedicated terminal session, as it will watch for changes
Open build/index.html in a browser

## Running the tests
Run unit tests along with coverage reports with the following:
nyc mocha tests/linkbox_test.js


## Deployment
The final application is really just a simple web page, plus external CSS and JS files, which you could embed within the HTML file to make it one file.

## Built With
Plain Vanilla JS, Pug, Sass, Gulp, Bundle-js, and various other packages to help with building, testing, etc.

## Contributing
Looking forward to any contributions, thoughts, and feedback.


## Versioning
0.3 upon initial release on Github.

## Authors
* **Harteg Wariyar** - *Initial work* - [greendost](https://github.com/greendost)


## License

This project is licensed under the Apache-2.0 License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments
Too many to thank, but certainly this code stands on the shoulders of many - web browser developers, Node / NPM package developers, Sass developers, testing tool developers (jsdom, Mocha, Chai, istanbul/nyc).  And of course designers whom I have met over the past few years - this is a design tool after all! 

