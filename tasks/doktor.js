module.exports = function(grunt) {
	"use strict";

	var NS = "doktor"
		,ejs = require("ejs")
		,marked = require("marked")
		,_ = require( 'lodash-node' );

	marked.setOptions({
		renderer: new marked.Renderer(),
		gfm: true,
		tables: true,
		breaks: false,
		pedantic: false,
		sanitize: false,
		smartLists: true,
		smartypants: false
	});

	grunt.registerMultiTask( NS
		,"Documentation generator for any text file, based on comments and tags"
		,function() {

		var CNF = this.options({
			openComment: "/***"
			,closeComment: "***/"
			,endCode: "/*@end*/"
			,pluginDir: "node_modules/"+NS
			,host: ""
			,ignoreDirNames: [ "_archive", "img" ]
			,homeTitle: "Root"
			,homeFilePath: null
			,unusedReadMeStr: "Add notes here in Markdown format"
			,cleanDest: false
			,banner: null
		});


		// add slash if one doesn't exist
		if( typeof CNF.host === "string" ) {
			if( CNF.host === "" || CNF.host.substr( CNF.host.length-1 ) !== "/" )
				CNF.host += "/";
		}


		var done = this.async();
		grunt.log.writeln( NS.yellow );

		if( this.files.length === 0 ) {
			grunt.log.error( "'"+NS+"' needs at least 1 src directory!".red );
			done();
			return;
		}

		var mdFound = false;
		this.files.forEach(function( fileObj ) {

			var snippetsPath = fileObj.dest + "/snippets/";

			// cleans out the old first
			if( CNF.cleanDest && grunt.file.exists(fileObj.dest) ) grunt.file.delete( fileObj.dest, {force:true} );

			var bootstrapFiles = grunt.file.expand({ cwd: CNF.pluginDir + "resources" }, "bootstrap-3.3.1/*");
			
			_.forEach( bootstrapFiles, function(relPath) {
				grunt.file.copy( CNF.pluginDir + "resources/" + relPath, fileObj.dest + "/"+relPath );
			});

			var commentsData = parseSrc( fileObj.src, CNF.homeFilePath, CNF.ignoreDirNames, CNF.unusedReadMeStr, 
										CNF.host, CNF.openComment, CNF.closeComment, CNF.endCode );

			writeNav( snippetsPath, fileObj.dest, CNF.host, CNF.homeTitle, commentsData );
			writeSnippets( snippetsPath, commentsData, CNF.host );
			writeTemplate( fileObj.dest, snippetsPath, commentsData, CNF.pluginDir, CNF.host, CNF.homeTitle, CNF.banner );

			// check that there are markdown files present
			if( checkForMarkdown(fileObj.src) ) mdFound = true;
		});
		
		// Markdown files are used to create pages in the output. They're not mandatory, but are generally a good idea.
		if( !mdFound )
			grunt.log.warn( "WARNING. Did not find any markdown '.md' files in your src.".yellow );

		done();
	});


	function writeNav( snippetsPath, dest, host, homeTitle, commentsData ) {
		var navMarkup = getNavMarkup( dest, host, homeTitle, commentsData );

		grunt.file.write( snippetsPath + "/nav-pages.html", navMarkup.pages );
		grunt.file.write( snippetsPath + "/nav-tags.html", navMarkup.tags );
	}

	function checkForMarkdown( srcArr ) {
		var mdFilesArr = _.where( srcArr, function(filename) {
			return filename.lastIndexOf(".md") === filename.length -3;
		});

		return mdFilesArr.length > 0;
	}


	function stripPreceedingDirChange( path ) {
		var newPath = ""
			,subDirStarted = false;
		_.forEach( path.split("../"), function( str ) {

			// ignore any paths at the start of path if they contain "../"
			if( str.length !== 0 ) subDirStarted = true;

			if( subDirStarted ) {
				newPath += str;
				// if( str.length === 0 )
			}
		});

		return newPath;
	}


	function writeTemplate( dest, snippetsPath, commentsData, pluginDir, host, homeTitle, banner ) {

		var templatePath = pluginDir + "resources/template.ejs"
		if( grunt.file.exists( templatePath ) ) {


			var navPagesMarkup = grunt.file.read( snippetsPath + "/nav-pages.html" )
				,navTagsMarkup = grunt.file.read( snippetsPath + "/nav-tags.html" )
				,homeDone = false;

			_.forEach( commentsData.readmeNav, function( navObj, name ) {

				// name = stripPreceedingDirChange( name );

				var path = dest + "/index.html";
				if( homeDone ) path = dest + "/" + name + ".html";
				homeDone = true;

				// sets the class to active for the current page
				var markup = navPagesMarkup.split("data-name='"+name+"'").join("class='active' data-name='"+name+"'");

				var rendered = ejs.render( grunt.file.read(templatePath), {
					config: {
						_:_
						,heading: null //name
						,nav: {
							pages: markup
							,tags: navTagsMarkup
							,breadcrumbs: (function(arr) {
								var markup = "";
								_.forEach(arr, function(crumb) {
									markup += "\n<li><a>"+crumb+"</a></li>";
								});
								return markup;
							})( name.split("/") )
						}
						,body: getTaggedMarkup( navObj, host, false, "<strong>View in-code docs by tag:</strong>" )
						,host: host
						,homeTitle: homeTitle
						,banner: banner || "-"
					}
				});

				// console.log( path );
				grunt.file.write( path, rendered );
			});


			_.forEach( getAllTags(commentsData), function( tag ) {

				var body = "";
				_.forEach( commentsData.codeComments, function( codeCmt ) {
					if( codeCmt.tags.indexOf(tag) !== -1 ) {
						body += "\n" + getCodeCmtMarkup(codeCmt, host) + "\n";
					}
				});

				var rendered = ejs.render( grunt.file.read(templatePath), {
					config: {
						_:_
						,heading: "Tag: " + tag
						,nav: {
							pages: navPagesMarkup
							,tags: navTagsMarkup
							,breadcrumbs: []
						}
						,body: body
						,host: host
						,homeTitle: homeTitle
						,banner: banner || "-"
					}
				});

				grunt.file.write( dest + "/tags/" + tag + ".html", rendered );
			});
		}
	}
	

	function getCodeCmtMarkup( codeCmt, host ) {
		var markdown = "";

		markdown += "###Source ("+codeCmt.ext+")\n";
		markdown += "`" + codeCmt.src + "`\n";

		markdown += "###Comments\n";
		markdown += codeCmt.docs + "\n";

		if( codeCmt.codeBlock ) {
			markdown += "###Code\n";
			markdown += "```\n" + codeCmt.codeBlock + "\n```\n";
		}

		markdown += "###Tags\n";
		markdown += convertTagToLink( codeCmt.tags, host, true ) + "\n";

		return "<section class='doktor-section'>" + marked( markdown ) + "</section>";
	}


	function writeSnippets( dest, commentsData, host ) {

		// This isn't really being used yet, but may come in handy

		_.forEach( commentsData.readmeNav, function( navObj, name ) {
			grunt.file.write( dest + "/" + name + ".html", getTaggedMarkup( navObj, host ) );
		});
		
		_.forEach( commentsData.codeComments, function( codeCmt ) {
			var markup = getCodeCmtMarkup( codeCmt, host );
			grunt.file.write( dest + "/code/" + codeCmt.ext + "/" + Math.random().toString().replace(".","") + ".html", markup );
		});
	}


	// Object must have 'markup' {string} and 'tags' {array of strings} properties
	function getTaggedMarkup( obj, host, useMarkDown, customTitle ) {

		var rx = new RegExp("@tags[\\d\\D]*?\\]", "g");

		var newMarkup = (customTitle || "@tags ") + convertTagToLink( obj.tags, host, useMarkDown );

		return obj.markup.replace(rx, newMarkup);
	}


	function convertTagToLink( tag, host, useMarkDown ) {
		var markdown = "";
		
		if( _.isArray(tag) ) {
			_.forEach(tag, function(t,i) {
				if(i>0) markdown += " , ";
				markdown += "["+t+"]("+host+"tags/"+t+".html)";
			});

			if( useMarkDown ) return markdown;
			return marked( markdown );
		}

		markdown += "["+tag+"]("+host+"tags/"+tag+".html)";

		if( useMarkDown ) return markdown;
		return marked( markdown );
		// return "<a href='"+host+"tags/"+tag+".html'>" + tag + "</a>";
	}


	function getNavMarkup( dest, host, homeTitle, commentsData ) {

		var homeDone = false
			,pages = ""
			,tags = "";

		_.forEach( commentsData.readmeNav, function( navObj, name ) {
			var path = host + "index.html"
				,linkName = homeTitle;

			if( homeDone ) {
				path = host + name + ".html";

				var linkNameArr = name.split("/");
				linkName = "";
				_.forEach( linkNameArr, function(nm,i) {
					if( i === linkNameArr.length-1 )
						linkName += nm;
					else
						// linkName += "&nbsp;&nbsp;";
						linkName += "> ";
				});
			}

			pages += "\n<li data-state='"+( navObj.unused ? "unused" : "used" )+"' data-name='"+name+"' ><a href='"+path+"'>" + linkName + "</a></li>";

			homeDone = true;
		});

		_.forEach( getAllTags(commentsData), function( tag ) {
			tags += "\n<li><a href='"+host+"tags/"+tag+".html'>" + tag + "</a></li>";
		});

		return {
			pages: pages
			,tags: tags
		}
	}




	function getAllTags( commentsData ) {

		var tags = [];

		// get readme tags
		_.forEach( commentsData.readmeNav, function( navObj, name ) {
			_.forEach( navObj.tags, function( tag ) {
				tags.push( tag );
			});
		});

		// get code comment tags
		_.forEach( commentsData.codeComments, function( codeCmt ) {
			_.forEach( codeCmt.tags, function( tag ) {
				tags.push( tag );
			});
		});

		// remove duplicates
		return _.unique( tags );
	}


	function parseSrc( srcArr, homeFilePath, ignoreDirNames, unusedReadMeStr, host, openComment, closeComment, endCode) {

		var codeComments = []
			,readmeNav = {};

		var homeSrc = homeFilePath;

		if( !homeSrc || !grunt.file.exists( homeSrc ) )
			throw new Error( "Option 'homeFilePath' was not found - got '" + homeSrc + "'. Did you forget to set it?" );

		// set the home page using 'homeFilePath'
		var dirSlashInd = homeSrc.lastIndexOf("/")
			,navObj = readmeNav[ "root" ] = {};
		
		marked( grunt.file.read(homeSrc), function(err, content) {
			if(err) grunt.log.error( err );

			navObj.markup = content;
			navObj.tags = getTags( content );
		});


			
		_.forEach( srcArr, function( src ) {

			var extDotInd = src.lastIndexOf(".")
				,ext = src.slice( extDotInd+1 );

			if( !grunt.file.exists( src ) ) {
				grunt.log.error("File doesn't exist: ".red + src);
				return false;
			}

			// filter out matching directories to ignore
			var ignoreSrc = _.filter( ignoreDirNames, function( dirName ) {
				return _.contains( src.split("/"), dirName );
			});

			if( ignoreSrc.length > 0 ) {
				grunt.log.warn("Skipping ignored directory: ".yellow + src);
				return;
			}


			if( ext === "md" ) {

				var dirSlashInd = src.lastIndexOf("/")
					,dir = stripPreceedingDirChange( src.slice( 0, dirSlashInd ) )
					,navObj = readmeNav[ dir ] = {}
					,markdown = grunt.file.read(src);
				
				marked( markdown, function(err, content) {
					if(err) grunt.log.error( err );

					navObj.markup = content;
					navObj.tags = getTags( content );
					navObj.unused = (content.indexOf(unusedReadMeStr) !== -1);
				});


				codeComments.push({
					ext: ext
					,tags: navObj.tags
					,docs: getTaggedMarkup( {
							markup: markdown.replace("#","####").split("\n#").join("\n####")
							,tags: navObj.tags
						}, host, true )
					,codeBlock: null
					,src: src
				});

			} else {

				var code = grunt.file.read(src)
					,commentArr = code.split( openComment );
				
				_.forEach( commentArr, function(cmt, i) {
					
					if(i>0) {

						
						var tags = getTags( cmt )
							,cmtBlockArr = cmt.split( closeComment )


						if( cmtBlockArr.length <= 1 ) {
							grunt.log.warn("Comment not closed properly. Must be closed with ".red + closeComment + " - src: " + src );
							return;
						}

						if( cmtBlockArr[1].indexOf( endCode ) === -1 ) {
							grunt.log.warn("Comment ".red + endCode + " not found. Must come after the related code block ".red + " - src: " + src  );

							// check for common typos
							if( cmtBlockArr[1].indexOf( "/*end*/" ) !== -1 )
								grunt.log.warn("`/*end*/` found. Did you accidently forget the `@` symbol  when writing `/*@end*/` ?"  );
							return;
						}
						
						var docs = getDocs( cmtBlockArr[0], closeComment )
							,codeBlock = cmtBlockArr[1].split( endCode )[0];

						codeComments.push({
							ext: ext
							,tags: tags
							,docs: docs
							,codeBlock: codeBlock
							,src: src
						});
					}
				});
				
			}

				// console.log( src );
			// console.log( codeComments );
		});

		return {
			codeComments: codeComments
			,readmeNav: readmeNav
		}
	}
	

	function getTags( str ) {
		var arr = str.split("@tags");
		if( arr.length === 1 ) return [];
		return sanitizeTags( arr[1].split("]")[0] + "]" );
	}

	function getDocs( str, closeComment ) {
		var arr = str.split("@docs");
		if( arr.length === 1 ) return "";
		return sanitizeDocs( str.split("@docs")[1].split( closeComment )[0] );
	}

	function sanitizeTags( str ) {
		return str.split("[").join("")
					.split("]").join("")
					.split('"').join('')
					.split('&quot;').join('')
					.split("'").join('')
					.split('&#39;').join('')
					.split(' ').join('')
					.split(",");
	}

	function sanitizeDocs( str ) {
		return str.split(" * ").join("<br>")
					.split("\t").join("")
					.split("  ").join(" ")
					.split("\n").join(" ")
					.split("\r").join(" ");
	}


	return {
		tests: {

		}
	}
};