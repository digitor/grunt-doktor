'use strict';

var _ = require("lodash-node")
	,fse = require("fs-extra");

describe("test 1 - doktor testable methods", function() {

	var doktor = require("../tasks/doktor.js")
		,testableMethods = doktor( require("grunt") ).tests;

	describe("sanitizeDocs()", function() {
		var fn = testableMethods.sanitizeDocs;

		it("should swap * symbols for <br> elements", function() {
			expect( fn("x *") ).toBe("x<br>");
			expect( fn("	*") ).toBe("<br>");
			expect( fn("\t*") ).toBe("<br>");
			expect( fn("\n*") ).toBe("<br>");

			// should leave single asterisk in
			expect( fn("x ** x") ).toBe("x * x");
		});

		it("should strip out double spaces", function() {
			expect( fn("x  *") ).toBe("x<br>");
			expect( fn("x   *") ).toBe("x<br>");
			expect( fn("x    *") ).toBe("x<br>");
			expect( fn("x     *") ).toBe("x<br>");
			expect( fn("x      *") ).toBe("x<br>");
			expect( fn("x       *") ).toBe("x<br>");
			expect( fn("x        *") ).toBe("x<br>");
			expect( fn("  ") ).toBe(" ");
			expect( fn("   ") ).toBe(" ");
			expect( fn("    ") ).toBe(" ");
			expect( fn("     ") ).toBe(" ");
			expect( fn("      ") ).toBe(" ");
			expect( fn("       ") ).toBe(" ");
		});

		it("should remove tabs", function() {
			expect( fn("\t") ).toBe("");
			expect( fn("\t ") ).toBe(" ");
			expect( fn("\t\t") ).toBe("");
			expect( fn("\t\t	") ).toBe("");
			expect( fn("			") ).toBe("");

		});
	});

	
	describe("sanitizeTags()", function() {
		var fn = testableMethods.sanitizeTags;

		it("return as array of strings", function() {
			// comparing contents of array, so needed `_.isEqual` helper
			expect( _.isEqual( fn("[a]"), ["a"] ) ).toBe( true );
			expect( _.isEqual( fn("  [a]"), ["a"] ) ).toBe( true );
			expect( _.isEqual( fn("['a']"), ["a"] ) ).toBe( true );
			expect( _.isEqual( fn("[\"a\"]"), ["a"] ) ).toBe( true );
			expect( _.isEqual( fn("[a,b,c]"), ["a","b","c"] ) ).toBe( true );
			expect( _.isEqual( fn("a"), ["a"] ) ).toBe( true );
			expect( _.isEqual( fn("a,b,c"), ["a","b","c"] ) ).toBe( true );
		});
	});


	describe("getDocs()", function() {
		var fn = testableMethods.getDocs
			,CLOSE = "***/";

		it("should check documentation strings are returned", function() {
			expect( fn("@docs Xx" + CLOSE, CLOSE) ).toBe("Xx");
			expect( fn("@docs	Xx" + CLOSE, CLOSE) ).toBe("Xx");
			expect( fn("@docs Xx" + CLOSE + "some more text that should be ignored", CLOSE) ).toBe("Xx");
		});
	});

});
