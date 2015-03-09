'use strict';

var _ = require("lodash-node")
	,fse = require("fs-extra");

describe("test 1 - doktor testable methods", function() {

	var doktor = require("../tasks/doktor.js")
		,testableMethods = doktor( require("grunt") ).tests;

	

});
